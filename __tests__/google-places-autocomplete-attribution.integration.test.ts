jest.mock('../src/map-providers/Leaflet/leaflet.vendor.css', () => ({}));
jest.mock('leaflet/dist/images/marker-icon.png', () => 'marker-icon');
jest.mock('leaflet/dist/images/marker-icon-2x.png', () => 'marker-icon-2x');
jest.mock('leaflet/dist/images/marker-shadow.png', () => 'marker-shadow');

import GooglePlacesAutocompleteProvider from '../src/autocomplete-provider/GooglePlacesAutocompleteProvider';

const flushTimers = async () => {
  await new Promise(resolve => setTimeout(resolve, 20));
};

const dispatchKey = (input: HTMLInputElement, keyCode: number) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'keyCode', { value: keyCode });
  input.dispatchEvent(event);
};

afterEach(() => {
  document.body.innerHTML = '';
  delete (globalThis as any).google;
});

it('keeps sibling attribution outside vendor traversal and selects the prediction after extra ArrowDown', async () => {
  const fetchFields = jest.fn().mockResolvedValue(undefined);
  const place = {
    formattedAddress: 'Paris, France',
    location: { lat: 48.8566, lng: 2.3522 },
    fetchFields,
  };
  const prediction = {
    text: { text: 'Paris, France' },
    mainText: { text: 'Paris, France' },
    toPlace: jest.fn(() => place),
  };
  const SessionToken = jest.fn().mockImplementation(() => ({}));
  const fetchAutocompleteSuggestions = jest.fn().mockResolvedValue({
    suggestions: [{ placePrediction: prediction }],
  });

  (globalThis as any).google = {
    maps: {
      importLibrary: jest.fn().mockResolvedValue({
        AutocompleteSessionToken: SessionToken,
        AutocompleteSuggestion: { fetchAutocompleteSuggestions },
      }),
    },
  };

  const input = document.createElement('input');
  document.body.append(input);
  const onSelect = jest.fn();
  const provider = new GooglePlacesAutocompleteProvider({ debounce: 0 });
  provider.setup({ getResults: jest.fn(), input, onSelect });

  input.value = 'Par';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await flushTimers();

  const list = input.parentElement?.querySelector('[role="listbox"]') as HTMLElement;
  const result = list.querySelector('[role="option"]') as HTMLElement;
  const attribution = list.nextElementSibling as HTMLElement;
  expect(result).not.toBeNull();
  expect(attribution).not.toBeNull();
  expect(attribution.classList.contains('locations-map-autocomplete-attribution')).toBe(true);
  expect(list.contains(attribution)).toBe(false);

  dispatchKey(input, 40);
  dispatchKey(input, 40);
  expect(result.getAttribute('aria-selected')).toBe('true');
  expect(attribution.getAttribute('aria-selected')).toBeNull();

  dispatchKey(input, 13);
  await flushTimers();

  expect(fetchFields).toHaveBeenCalledWith({ fields: ['location', 'formattedAddress'] });
  expect(onSelect).toHaveBeenCalledWith({
    latitude: 48.8566,
    longitude: 2.3522,
    name: 'Paris, France',
  });
  expect(attribution.isConnected).toBe(false);
  expect((provider as any).autocomplete.list?.contains(attribution)).toBe(false);
});
