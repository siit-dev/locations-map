jest.mock('../src/map-providers/Leaflet/leaflet.vendor.css', () => ({}));
jest.mock('leaflet/dist/images/marker-icon.png', () => 'marker-icon');
jest.mock('leaflet/dist/images/marker-icon-2x.png', () => 'marker-icon-2x');
jest.mock('leaflet/dist/images/marker-shadow.png', () => 'marker-shadow');

import LocationsMap from '../src/LocationsMap';
import Autocomplete from '../src/autocomplete-provider/Autocomplete';

const flushPromises = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const makeMapProvider = () => ({
  initializeMap: jest.fn().mockResolvedValue(undefined),
  setParent: jest.fn().mockReturnThis(),
  addMapMarkers: jest.fn().mockReturnThis(),
  addMarkerHoverCallback: jest.fn().mockReturnThis(),
  addMarkerClickCallback: jest.fn().mockReturnThis(),
  filterMarkers: jest.fn().mockReturnThis(),
  highlightMapMarker: jest.fn().mockReturnThis(),
  unhighlightMarkers: jest.fn().mockReturnThis(),
  panTo: jest.fn().mockReturnThis(),
  setZoom: jest.fn().mockReturnThis(),
  zoomToContent: jest.fn().mockReturnThis(),
  displayMarkerTooltip: jest.fn().mockReturnThis(),
  closeMarkerTooltip: jest.fn().mockReturnThis(),
});

const makeAutocompleteProvider = (start?: jest.Mock, getResults?: jest.Mock) => ({
  parent: null,
  input: null,
  setParent: jest.fn().mockReturnThis(),
  setup: jest.fn(),
  ...(start ? { start } : {}),
  ...(getResults ? { getResults } : {}),
});

const makeSearchProvider = (autocompleteData: any[], searchResults: any[]) => ({
  search: jest.fn().mockResolvedValue(searchResults),
  searchZip: jest.fn().mockResolvedValue(searchResults),
  getAutocompleteData: jest.fn().mockReturnValue(autocompleteData),
});

const makeSearchResult = (name: string, latitude: number, longitude: number) => ({
  name,
  latitude,
  longitude,
});

const createMap = async ({
  locations,
  searchProvider,
  autocompleteProvider,
  filterAutocompleteResults,
}: {
  locations: any[];
  searchProvider: any;
  autocompleteProvider: any;
  filterAutocompleteResults?: false | { maxDistance: number };
}) => {
  const container = document.createElement('locations-map-container');
  container.innerHTML = `
    <form data-location-search>
      <input type="search" />
    </form>
    <locations-map-target></locations-map-target>
  `;
  document.body.append(container);

  const mapProvider = makeMapProvider();
  const map = new LocationsMap(container, {
    displaySearch: true,
    geolocateOnStart: false,
    latitude: 0,
    longitude: 0,
    locations,
    mapProvider,
    searchProvider,
    autocompleteProvider,
    filterAutocompleteResults,
  });
  await flushPromises();

  return {
    map,
    mapProvider,
    input: container.querySelector('input') as HTMLInputElement,
  };
};

afterEach(() => {
  document.body.innerHTML = '';
});

it('starts autocomplete when the provider returns ZERO_RESULTS', async () => {
  const start = jest.fn();
  const searchProvider = makeSearchProvider([], []);
  const { map, input } = await createMap({
    locations: [],
    searchProvider,
    autocompleteProvider: makeAutocompleteProvider(start),
    filterAutocompleteResults: { maxDistance: 60 },
  });
  input.value = 'Nowhere';

  await map.doSearch();

  expect(start).toHaveBeenCalledWith('Nowhere');
  expect(searchProvider.search).toHaveBeenCalledWith('Nowhere');
});

it('renders the configured no-results feedback after an empty submit', async () => {
  const searchProvider = makeSearchProvider([], []);
  const autocompleteProvider = new Autocomplete({
    threshold: 0,
    debounce: 0,
    resultsList: {
      noResults: true,
      element: (list: HTMLElement, data: any) => {
        if (!data.results.length) {
          list.dataset.noResults = 'true';
          list.textContent = 'No locations found';
        }
      },
    },
  });
  const { map, input } = await createMap({
    locations: [],
    searchProvider,
    autocompleteProvider,
  });
  input.value = 'Nowhere';

  await map.doSearch();
  await flushPromises();

  const list = input.parentElement?.querySelector('[role="listbox"]') as HTMLElement;
  expect(list.hidden).toBe(false);
  expect(list.dataset.noResults).toBe('true');
  expect(list.textContent).toBe('No locations found');
});

it('starts autocomplete when all raw results are outside the configured distance', async () => {
  const farAway = makeSearchResult('New York, USA', 40.7128, -74.006);
  const start = jest.fn();
  const searchProvider = makeSearchProvider([{ title: farAway.name, result: farAway }], [farAway]);
  const { map, input } = await createMap({
    locations: [{ id: 1, latitude: 48.8566, longitude: 2.3522 }],
    searchProvider,
    autocompleteProvider: makeAutocompleteProvider(start),
    filterAutocompleteResults: { maxDistance: 60 },
  });
  const updateFromSearch = jest.spyOn(map as any, 'updateFromSearch');
  input.value = 'New York';

  await map.doSearch();

  expect(updateFromSearch).not.toHaveBeenCalled();
  expect(start).toHaveBeenCalledWith('New York');
});

it('uses the built-in provider query normalization for submit searches', async () => {
  const nearby = makeSearchResult('Paris, France', 48.8566, 2.3522);
  const normalize = jest.fn((value: string) => value.trim().toLowerCase());
  const searchProvider = makeSearchProvider([{ title: nearby.name, result: nearby }], [nearby]);
  const autocompleteProvider = new Autocomplete({ query: normalize });
  const { map, input } = await createMap({
    locations: [{ id: 1, latitude: 48.8566, longitude: 2.3522 }],
    searchProvider,
    autocompleteProvider,
    filterAutocompleteResults: { maxDistance: 60 },
  });
  const updateFromSearch = jest.spyOn(map as any, 'updateFromSearch');
  input.value = '  PARIS  ';

  await map.doSearch();

  expect(normalize).toHaveBeenCalledWith('  PARIS  ');
  expect(searchProvider.search).toHaveBeenCalledWith('paris');
  expect(updateFromSearch).toHaveBeenCalledWith(nearby);
});

it('selects the first candidate remaining after distance filtering', async () => {
  const farAway = makeSearchResult('New York, USA', 40.7128, -74.006);
  const nearby = makeSearchResult('Paris, France', 48.8566, 2.3522);
  const start = jest.fn();
  const searchProvider = makeSearchProvider(
    [
      { title: farAway.name, result: farAway },
      { title: nearby.name, result: nearby },
    ],
    [farAway, nearby],
  );
  const { map, input } = await createMap({
    locations: [{ id: 1, latitude: 48.8566, longitude: 2.3522 }],
    searchProvider,
    autocompleteProvider: makeAutocompleteProvider(start),
    filterAutocompleteResults: { maxDistance: 60 },
  });
  const updateFromSearch = jest.spyOn(map as any, 'updateFromSearch');
  input.value = 'Paris';

  await map.doSearch();

  expect(updateFromSearch).toHaveBeenCalledWith(nearby);
  expect(start).not.toHaveBeenCalled();
});

it('preserves first-result submit behavior when distance filtering is disabled', async () => {
  const farAway = makeSearchResult('New York, USA', 40.7128, -74.006);
  const start = jest.fn();
  const searchProvider = makeSearchProvider([{ title: farAway.name, result: farAway }], [farAway]);
  const { map, input } = await createMap({
    locations: [{ id: 1, latitude: 48.8566, longitude: 2.3522 }],
    searchProvider,
    autocompleteProvider: makeAutocompleteProvider(start),
    filterAutocompleteResults: false,
  });
  const updateFromSearch = jest.spyOn(map as any, 'updateFromSearch');
  input.value = 'New York';

  await map.doSearch();

  expect(updateFromSearch).toHaveBeenCalledWith(farAway);
  expect(start).not.toHaveBeenCalled();
});

it('does not require custom autocomplete providers to implement start', async () => {
  const farAway = makeSearchResult('New York, USA', 40.7128, -74.006);
  const searchProvider = makeSearchProvider([{ title: farAway.name, result: farAway }], [farAway]);
  const { map, input } = await createMap({
    locations: [{ id: 1, latitude: 48.8566, longitude: 2.3522 }],
    searchProvider,
    autocompleteProvider: makeAutocompleteProvider(),
    filterAutocompleteResults: { maxDistance: 60 },
  });
  input.value = 'New York';

  await expect(map.doSearch()).resolves.toBeUndefined();
});

it('falls back to map autocomplete results for custom providers without getResults', async () => {
  const nearby = makeSearchResult('Paris, France', 48.8566, 2.3522);
  const searchProvider = makeSearchProvider([{ title: nearby.name, result: nearby }], [nearby]);
  const { map, input } = await createMap({
    locations: [{ id: 1, latitude: 48.8566, longitude: 2.3522 }],
    searchProvider,
    autocompleteProvider: makeAutocompleteProvider(),
    filterAutocompleteResults: { maxDistance: 60 },
  });
  const updateFromSearch = jest.spyOn(map as any, 'updateFromSearch');
  input.value = 'Paris';

  await map.doSearch();

  expect(searchProvider.search).toHaveBeenCalledWith('Paris');
  expect(updateFromSearch).toHaveBeenCalledWith(nearby);
});
