import {
  Autocomplete,
  LeafletMapClusteredWrapper,
  LocationContainerSettings,
  LocationsMap,
  MapboxMapClusteredWrapper,
  MapboxMapWrapper,
  NominatimProvider,
  Pagination,
} from '.';
import './scss/main.scss';
import './scss/demo.scss';
import FranceGovSearchProvider from './search-providers/FranceGovSearchProvider';

document.addEventListener('DOMContentLoaded', async () => {
  const locations = [
    {
      id: 1,
      name: 'First location',
      address1: 'Paris',
      postcode: '12345',
      phone: '123456789',
      city: 'Nantes',
      longitude: 2.35,
      latitude: 48.8,
      filterTypes: ['location', 'forest'],
    },
    {
      id: 2,
      name: 'Second location',
      address1: 'Paris',
      postcode: '12345',
      phone: '123456789',
      city: 'Nantes',
      longitude: 1.55,
      latitude: 47.2,
      filterTypes: ['location'],
    },
    {
      id: 3,
      name: 'Third location',
      address1: 'Paris',
      postcode: '12345',
      phone: '123456789',
      city: 'Nantes',
      longitude: 1.58,
      latitude: 47.23,
      filterTypes: ['forest'],
    },
  ];

  const container = document.querySelector<HTMLElement>('locations-map-container');
  if (!container) {
    throw new Error('Container not found');
  }

  const searchParams = new URLSearchParams(window.location.search);
  const provider = searchParams.get('provider') || 'leaflet';
  const mapboxToken = searchParams.get('mapboxToken') || process.env.MAPBOX_ACCESS_TOKEN || '';

  let mapProvider: LocationContainerSettings['mapProvider'] = new LeafletMapClusteredWrapper();
  if (provider === 'mapbox' || provider === 'mapbox-clustered') {
    if (!mapboxToken) {
      container.insertAdjacentHTML(
        'afterbegin',
        '<p class="locations-map-demo-error">Missing Mapbox token. Add ?mapboxToken=... or set MAPBOX_ACCESS_TOKEN before starting the demo.</p>',
      );
      return;
    }

    const mapboxgl = normalizeMapboxModule(await import('mapbox-gl'));
    const mapboxSettings = {
      apiSettings: {
        accessToken: mapboxToken,
        style: 'mapbox://styles/mapbox/streets-v11',
      },
      mapboxgl,
      clusterSettings: {
        clusterRadius: 50,
        clusterMaxZoom: 14,
      },
    };
    mapProvider =
      provider === 'mapbox-clustered'
        ? new MapboxMapClusteredWrapper(mapboxSettings)
        : new MapboxMapWrapper(mapboxSettings);
  }

  // const searchProvider = new NominatimProvider();
  const searchProvider = new FranceGovSearchProvider();
  const paginationProvider = new Pagination({
    page: 5,
    pagination: {
      paginationClass: 'pagination',
      item: "<li><a class='page'></a></li>",
      outerWindow: 1,
    },
  });
  const autocompleteProvider = new Autocomplete();

  const locationsMapSettings: Partial<LocationContainerSettings> = {
    latitude: 47.8,
    longitude: 2.1,
    zoom: 6,
    locations,
    displaySearch: true,
    filters: [],
    searchProvider,
    mapProvider,
    paginationProvider,
    autocompleteProvider,
  };

  const locationsMap = new LocationsMap(container, locationsMapSettings);
});

function normalizeMapboxModule(module: any) {
  return module.default || module;
}
