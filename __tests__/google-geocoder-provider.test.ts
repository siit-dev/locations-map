import GoogleMapsGeocoderProvider from '../src/search-providers/GoogleMapsGeocoderProvider';

const googleMapsGeocoderStatus = {
  OK: 'OK',
  ZERO_RESULTS: 'ZERO_RESULTS',
  ERROR: 'ERROR',
};

const makeGeocoderResult = (formattedAddress: string, latitude: number, longitude: number) =>
  ({
    formatted_address: formattedAddress,
    geometry: {
      location: {
        lat: () => latitude,
        lng: () => longitude,
      },
    },
  }) as unknown as google.maps.GeocoderResult;

let geocoder: { geocode: jest.Mock };

beforeEach(() => {
  document.documentElement.lang = 'fr';
  geocoder = { geocode: jest.fn() };
  (globalThis as any).google = {
    maps: {
      Geocoder: jest.fn(() => geocoder),
      GeocoderStatus: googleMapsGeocoderStatus,
    },
  };
});

it('maps successful Google geocoder results', async () => {
  const googleResult = makeGeocoderResult('Paris, France', 48.8566, 2.3522);
  geocoder.geocode.mockImplementation((_request, callback) => callback([googleResult], 'OK'));
  const provider = new GoogleMapsGeocoderProvider();

  await expect(provider.search('Paris')).resolves.toEqual([
    {
      latitude: 48.8566,
      longitude: 2.3522,
      name: 'Paris, France',
      originalInfo: googleResult,
    },
  ]);
  expect(geocoder.geocode).toHaveBeenCalledWith({ address: 'Paris, fr', region: 'FR' }, expect.any(Function));
});

it('resolves zero results and clears stale autocomplete data', async () => {
  const googleResult = makeGeocoderResult('Paris, France', 48.8566, 2.3522);
  geocoder.geocode
    .mockImplementationOnce((_request, callback) => callback([googleResult], 'OK'))
    .mockImplementationOnce((_request, callback) => callback([], 'ZERO_RESULTS'));
  const provider = new GoogleMapsGeocoderProvider();

  await provider.search('Paris');
  expect(provider.getAutocompleteData()).toHaveLength(1);

  await expect(provider.search('Nowhere')).resolves.toEqual([]);
  expect(provider.getAutocompleteData()).toEqual([]);
});

it('rejects genuine geocoder failures with the existing error payload', async () => {
  const staleResult = makeGeocoderResult('Paris, France', 48.8566, 2.3522);
  const failedResults = [makeGeocoderResult('Unavailable, France', 1, 2)];
  geocoder.geocode
    .mockImplementationOnce((_request, callback) => callback([staleResult], 'OK'))
    .mockImplementationOnce((_request, callback) => callback(failedResults, 'ERROR'));
  const provider = new GoogleMapsGeocoderProvider();

  await provider.search('Paris');
  await expect(provider.search('Unavailable')).rejects.toEqual({
    results: failedResults,
    status: 'ERROR',
  });
  expect(provider.getAutocompleteData()).toEqual([]);
});
