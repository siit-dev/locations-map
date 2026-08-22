jest.mock('@tarekraafat/autocomplete.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../src/map-providers/Leaflet/leaflet.vendor.css', () => ({}));
jest.mock('leaflet/dist/images/marker-icon.png', () => 'marker-icon');
jest.mock('leaflet/dist/images/marker-icon-2x.png', () => 'marker-icon-2x');
jest.mock('leaflet/dist/images/marker-shadow.png', () => 'marker-shadow');

import * as library from '../src';
import GooglePlacesAutocompleteProvider from '../src/autocomplete-provider/GooglePlacesAutocompleteProvider';
import LocationsMap from '../src/LocationsMap';

const autoCompleteMock = jest.requireMock('@tarekraafat/autocomplete.js').default as jest.Mock;

type PlacesMocks = {
  fetchAutocompleteSuggestions: jest.Mock;
  importLibrary: jest.Mock;
  SessionToken: jest.Mock;
  tokens: Array<{ id: number }>;
};

const setupGoogle = (): PlacesMocks => {
  let tokenId = 0;
  const tokens: Array<{ id: number }> = [];
  const SessionToken = jest.fn().mockImplementation(() => {
    const token = { id: ++tokenId };
    tokens.push(token);
    return token;
  });
  const fetchAutocompleteSuggestions = jest.fn().mockResolvedValue({ suggestions: [] });
  const importLibrary = jest.fn().mockResolvedValue({
    AutocompleteSessionToken: SessionToken,
    AutocompleteSuggestion: { fetchAutocompleteSuggestions },
  });

  (globalThis as any).google = { maps: { importLibrary } };
  return { fetchAutocompleteSuggestions, importLibrary, SessionToken, tokens };
};

const makePrediction = (text: string, place?: any) => ({
  text: { text },
  mainText: { text },
  toPlace: jest.fn(() => place),
});

const setupProvider = (options: Record<string, any> = {}) => {
  const input = document.createElement('input');
  const form = document.createElement('form');
  form.append(input);
  document.body.append(form);
  const onSelect = jest.fn();
  const provider = new GooglePlacesAutocompleteProvider(options);
  provider.setup({ getResults: jest.fn(), input, onSelect });
  const config = autoCompleteMock.mock.calls[autoCompleteMock.mock.calls.length - 1][0];

  return { config, form, input, onSelect, provider };
};

const flushPromises = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

beforeEach(() => {
  autoCompleteMock.mockClear();
});

afterEach(() => {
  document.body.innerHTML = '';
  delete (globalThis as any).google;
});

it('exports the provider from the root and package subpath', () => {
  const packageExports = require('../package.json').exports;

  expect(library.GooglePlacesAutocompleteProvider).toBe(GooglePlacesAutocompleteProvider);
  expect(packageExports['./GooglePlacesAutocompleteProvider']).toEqual({
    types: './dist/types/autocomplete-provider/GooglePlacesAutocompleteProvider.d.mts',
    import: './dist/esm/autocomplete-provider/GooglePlacesAutocompleteProvider.js',
  });
});

it('uses generic request defaults and preserves autoComplete.js settings', async () => {
  const google = setupGoogle();
  google.fetchAutocompleteSuggestions.mockResolvedValueOnce({ suggestions: [] });
  const { config } = setupProvider({ threshold: 5, debounce: 120 });

  await expect(config.data.src('Paris')).resolves.toEqual([]);

  expect(config.threshold).toBe(5);
  expect(config.debounce).toBe(120);
  expect(google.importLibrary).toHaveBeenCalledWith('places');
  expect(google.fetchAutocompleteSuggestions).toHaveBeenCalledWith({
    input: 'Paris',
    sessionToken: google.tokens[0],
  });
});

it('passes Places request options without adding implicit country or type filters', async () => {
  const google = setupGoogle();
  const { config } = setupProvider({
    includedRegionCodes: ['fr'],
    includedPrimaryTypes: ['(regions)'],
    language: 'fr',
    region: 'FR',
    locationBias: { lat: 48.8566, lng: 2.3522 },
  });

  await config.data.src('Paris');

  expect(google.fetchAutocompleteSuggestions).toHaveBeenCalledWith({
    includedRegionCodes: ['fr'],
    includedPrimaryTypes: ['(regions)'],
    language: 'fr',
    region: 'FR',
    locationBias: { lat: 48.8566, lng: 2.3522 },
    input: 'Paris',
    sessionToken: google.tokens[0],
  });
});

it('maps place predictions for the UI and keeps empty responses empty', async () => {
  const google = setupGoogle();
  const prediction = makePrediction('Paris, France');
  google.fetchAutocompleteSuggestions.mockResolvedValueOnce({
    suggestions: [{ placePrediction: prediction }],
  });
  const { config } = setupProvider();

  await expect(config.data.src('Par')).resolves.toEqual([{ title: 'Paris, France', prediction }]);
  google.fetchAutocompleteSuggestions.mockResolvedValueOnce({ suggestions: [] });
  await expect(config.data.src('Nowhere')).resolves.toEqual([]);
});

it('reuses one session token while typing and rotates it after clear, reset, and blur', async () => {
  const google = setupGoogle();
  const { config, form, input } = setupProvider();

  await config.data.src('Par');
  await config.data.src('Paris');
  expect(google.SessionToken).toHaveBeenCalledTimes(1);
  expect(google.fetchAutocompleteSuggestions.mock.calls[0][0].sessionToken).toBe(
    google.fetchAutocompleteSuggestions.mock.calls[1][0].sessionToken,
  );

  input.value = '';
  input.dispatchEvent(new Event('input'));
  await config.data.src('Lyon');
  expect(google.SessionToken).toHaveBeenCalledTimes(2);

  form.dispatchEvent(new Event('reset'));
  await config.data.src('Nice');
  expect(google.SessionToken).toHaveBeenCalledTimes(3);

  input.dispatchEvent(new Event('blur'));
  await config.data.src('Nantes');
  expect(google.SessionToken).toHaveBeenCalledTimes(4);
});

it('rotates the session when autoComplete.js emits clear for Escape', async () => {
  const google = setupGoogle();
  const { config, input } = setupProvider();

  await config.data.src('Par');
  input.dispatchEvent(new Event('clear'));
  await config.data.src('Paris');

  expect(google.SessionToken).toHaveBeenCalledTimes(2);
});

it('uninitializes the previous autoComplete.js instance and avoids duplicate listeners on re-setup', () => {
  const firstInstance = { unInit: jest.fn() };
  const secondInstance = { unInit: jest.fn() };
  autoCompleteMock.mockImplementationOnce(() => firstInstance).mockImplementationOnce(() => secondInstance);

  const input = document.createElement('input');
  document.body.append(input);
  const provider = new GooglePlacesAutocompleteProvider();
  const resetSession = jest.spyOn(provider as any, 'resetSession');
  const settings = { getResults: jest.fn(), input, onSelect: jest.fn() };

  provider.setup(settings);
  provider.setup(settings);
  input.dispatchEvent(new Event('clear'));

  expect(firstInstance.unInit).toHaveBeenCalledTimes(1);
  expect(secondInstance.unInit).not.toHaveBeenCalled();
  expect(resetSession).toHaveBeenCalledTimes(1);
});

it('composes consumer resultsList callbacks with visible, non-selectable attribution', () => {
  const consumerElement = jest.fn((list: HTMLElement) => {
    list.dataset.consumerCallback = 'called';
  });
  const { config, input } = setupProvider({ resultsList: { element: consumerElement } });
  const element = config.resultsList.element as (list: HTMLElement, data: any) => void;
  const container = document.createElement('div');
  const list = document.createElement('ul');
  container.append(list);
  document.body.append(container);
  const data = { results: [{ value: { title: 'Paris' } }] };

  element(list, data);
  element(list, data);

  const attribution = container.querySelector('.locations-map-autocomplete-attribution');
  expect(consumerElement).toHaveBeenCalledWith(list, data);
  expect(list.dataset.consumerCallback).toBe('called');
  expect(attribution).not.toBeNull();
  expect(attribution?.textContent).toBe('Google Maps');
  expect(attribution?.tagName).toBe('DIV');
  expect(attribution?.getAttribute('role')).toBe('note');
  expect(attribution?.getAttribute('aria-hidden')).toBeNull();
  expect(list.contains(attribution)).toBe(false);
  expect(list.nextElementSibling).toBe(attribution);
  expect(container.querySelectorAll('.locations-map-autocomplete-attribution')).toHaveLength(1);

  input.dispatchEvent(new Event('close'));
  expect(container.querySelector('.locations-map-autocomplete-attribution')).toBeNull();

  const emptyList = document.createElement('ul');
  container.append(emptyList);
  element(emptyList, { results: [] });
  expect(container.querySelector('.locations-map-autocomplete-attribution')).toBeNull();
});

it('suppresses an older response when requests resolve out of order', async () => {
  const google = setupGoogle();
  const deferred: Record<string, { resolve: (value: any) => void }> = {};
  google.fetchAutocompleteSuggestions.mockImplementation((request: { input: string }) => {
    return new Promise(resolve => {
      deferred[request.input] = { resolve };
    });
  });
  const { config } = setupProvider();

  const oldRequest = config.data.src('old');
  await flushPromises();
  const newRequest = config.data.src('new');
  await flushPromises();
  deferred.new.resolve({ suggestions: [{ placePrediction: makePrediction('New') }] });
  await expect(newRequest).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ title: 'New' })]));
  deferred.old.resolve({ suggestions: [{ placePrediction: makePrediction('Old') }] });
  await expect(oldRequest).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ title: 'New' })]));
  expect(await oldRequest).not.toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Old' })]));
});

it('turns loading and API errors into empty suggestions', async () => {
  const google = setupGoogle();
  google.fetchAutocompleteSuggestions.mockRejectedValueOnce(new Error('Places unavailable'));
  const { config } = setupProvider();

  await expect(config.data.src('Paris')).resolves.toEqual([]);

  google.importLibrary.mockReset().mockRejectedValueOnce(new Error('Library unavailable'));
  const secondProvider = setupProvider();
  await expect(secondProvider.config.data.src('Paris')).resolves.toEqual([]);
});

it('fetches only Essentials fields and normalizes a selected place without originalInfo', async () => {
  const google = setupGoogle();
  const fetchFields = jest.fn().mockResolvedValue(undefined);
  const place = {
    formattedAddress: 'Paris, France',
    location: { lat: () => 48.8566, lng: () => 2.3522 },
    fetchFields,
  };
  const prediction = makePrediction('Paris', place);
  google.fetchAutocompleteSuggestions.mockResolvedValueOnce({ suggestions: [{ placePrediction: prediction }] });
  const { config, input, onSelect } = setupProvider();
  await config.data.src('Par');

  input.dispatchEvent(
    new CustomEvent('selection', {
      detail: { selection: { value: { title: 'Paris', prediction } } },
    }),
  );
  await flushPromises();

  expect(fetchFields).toHaveBeenCalledTimes(1);
  expect(fetchFields).toHaveBeenCalledWith({ fields: ['location', 'formattedAddress'] });
  expect(onSelect).toHaveBeenCalledWith({
    latitude: 48.8566,
    longitude: 2.3522,
    name: 'Paris, France',
  });
  expect(onSelect.mock.calls[0][0]).not.toHaveProperty('originalInfo');
});

it('uses prediction text when formattedAddress is missing and skips missing locations', async () => {
  const google = setupGoogle();
  const place = {
    location: { lat: 48.8, lng: 2.3 },
    fetchFields: jest.fn().mockResolvedValue(undefined),
  };
  const prediction = makePrediction('Paris fallback', place);
  const { config, input, onSelect } = setupProvider();
  await config.data.src('Par');
  input.dispatchEvent(new CustomEvent('selection', { detail: { selection: { value: { prediction } } } }));
  await flushPromises();
  expect(onSelect).toHaveBeenCalledWith({ latitude: 48.8, longitude: 2.3, name: 'Paris fallback' });

  const missingLocation = makePrediction('No location', {
    fetchFields: jest.fn().mockResolvedValue(undefined),
  });
  input.dispatchEvent(
    new CustomEvent('selection', { detail: { selection: { value: { prediction: missingLocation } } } }),
  );
  await flushPromises();
  expect(onSelect).toHaveBeenCalledTimes(1);
});

it('swallows selection failures, leaves the map callback untouched, and rotates the session', async () => {
  const google = setupGoogle();
  const place = {
    location: { lat: 1, lng: 2 },
    fetchFields: jest.fn().mockRejectedValue(new Error('Details unavailable')),
  };
  const prediction = makePrediction('Unavailable', place);
  const { config, input, onSelect } = setupProvider();
  await config.data.src('Una');
  input.dispatchEvent(new CustomEvent('selection', { detail: { selection: { value: { prediction } } } }));
  await flushPromises();
  expect(onSelect).not.toHaveBeenCalled();

  await config.data.src('Retry');
  expect(google.SessionToken).toHaveBeenCalledTimes(2);
});

it.each([
  ['success', (resolve: (value?: unknown) => void) => resolve()],
  [
    'failure',
    (_resolve: (value?: unknown) => void, reject: (reason?: unknown) => void) =>
      reject(new Error('Details unavailable')),
  ],
])('rotates the session immediately and preserves the new session after old selection %s', async (_outcome, settle) => {
  const google = setupGoogle();
  let settleDetails: ((value?: unknown) => void) | undefined;
  let rejectDetails: ((reason?: unknown) => void) | undefined;
  const fetchFields = jest.fn(
    () =>
      new Promise((resolve, reject) => {
        settleDetails = resolve;
        rejectDetails = reject;
      }),
  );
  const place = {
    formattedAddress: 'Paris, France',
    location: { lat: 48.8566, lng: 2.3522 },
    fetchFields,
  };
  const prediction = makePrediction('Paris', place);
  const { config, input } = setupProvider();
  await config.data.src('Par');
  input.dispatchEvent(new CustomEvent('selection', { detail: { selection: { value: { prediction } } } }));
  await flushPromises();

  await config.data.src('New query');
  expect(google.SessionToken).toHaveBeenCalledTimes(2);

  settle(settleDetails!, rejectDetails!);
  await flushPromises();
  await config.data.src('Newer query');
  expect(google.SessionToken).toHaveBeenCalledTimes(2);
});

it('catches a rejected form search without propagating or updating the map', async () => {
  const searchForm = document.createElement('form');
  searchForm.setAttribute('data-location-search', '');
  searchForm.innerHTML = '<input type="search" />';
  const container = document.createElement('locations-map-container');
  container.append(searchForm, document.createElement('locations-map-target'));
  document.body.append(container);

  const mapProvider = {
    setParent: jest.fn().mockReturnThis(),
    initializeMap: jest.fn().mockResolvedValue(undefined),
    addMapMarkers: jest.fn().mockReturnThis(),
    addMarkerClickCallback: jest.fn().mockReturnThis(),
    filterMarkers: jest.fn().mockReturnThis(),
    unhighlightMarkers: jest.fn().mockReturnThis(),
  } as any;
  const searchProvider = {
    search: jest.fn(),
    searchZip: jest.fn(),
    getAutocompleteData: jest.fn().mockReturnValue([]),
  } as any;

  const map = new LocationsMap(container, {
    displaySearch: true,
    locations: [],
    mapProvider,
    searchProvider,
    geolocateOnStart: false,
  });
  await flushPromises();
  const doSearch = jest.spyOn(map, 'doSearch').mockRejectedValue(new Error('Search unavailable'));

  expect(() => searchForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).not.toThrow();
  await flushPromises();
  expect(doSearch).toHaveBeenCalledTimes(1);
  expect(mapProvider.addMapMarkers).toHaveBeenCalledTimes(1);
});
