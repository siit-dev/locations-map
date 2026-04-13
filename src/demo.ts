import {
  Autocomplete,
  AdvancedPagination,
  LeafletMapClusteredWrapper,
  LocationContainerSettings,
  LocationsMap,
  MapboxMapClusteredWrapper,
  MapboxMapWrapper,
  NominatimProvider,
} from '.';
import './scss/main.scss';
import './scss/demo.scss';
import FranceGovSearchProvider from './search-providers/FranceGovSearchProvider';

document.addEventListener('DOMContentLoaded', async () => {
  const locations = [
    {
      id: 1,
      name: 'First location',
      address1: '1 Rue de Rivoli',
      postcode: '75001',
      phone: '0123456701',
      city: 'Paris',
      longitude: 2.35,
      latitude: 48.86,
      filterTypes: ['location', 'forest'],
    },
    {
      id: 2,
      name: 'Second location',
      address1: '2 Allée des Pins',
      postcode: '44000',
      phone: '0223456702',
      city: 'Nantes',
      longitude: 1.55,
      latitude: 47.2,
      filterTypes: ['location'],
    },
    {
      id: 3,
      name: 'Third location',
      address1: '3 Place du Capitole',
      postcode: '31000',
      phone: '0523456703',
      city: 'Toulouse',
      longitude: 1.44,
      latitude: 43.6,
      filterTypes: ['forest'],
    },
    {
      id: 4,
      name: 'Fourth location',
      address1: '4 Cours Mirabeau',
      postcode: '13100',
      phone: '0423456704',
      city: 'Aix-en-Provence',
      longitude: 5.45,
      latitude: 43.53,
      filterTypes: ['location'],
    },
    {
      id: 5,
      name: 'Fifth location',
      address1: '5 Rue de la Paix',
      postcode: '06000',
      phone: '0423456705',
      city: 'Nice',
      longitude: 7.26,
      latitude: 43.71,
      filterTypes: ['location', 'forest'],
    },
    {
      id: 6,
      name: 'Sixth location',
      address1: '6 Avenue Victor Hugo',
      postcode: '69002',
      phone: '0423456706',
      city: 'Lyon',
      longitude: 4.83,
      latitude: 45.74,
      filterTypes: ['forest'],
    },
    {
      id: 7,
      name: 'Seventh location',
      address1: '7 Rue du Grand Moulin',
      postcode: '67000',
      phone: '0323456707',
      city: 'Strasbourg',
      longitude: 7.75,
      latitude: 48.57,
      filterTypes: ['location'],
    },
    {
      id: 8,
      name: 'Eighth location',
      address1: '8 Boulevard de la Liberté',
      postcode: '59000',
      phone: '0323456708',
      city: 'Lille',
      longitude: 3.06,
      latitude: 50.63,
      filterTypes: ['location', 'forest'],
    },
    {
      id: 9,
      name: 'Ninth location',
      address1: '9 Quai de la Daurade',
      postcode: '33000',
      phone: '0523456709',
      city: 'Bordeaux',
      longitude: -0.57,
      latitude: 44.84,
      filterTypes: ['location'],
    },
    {
      id: 10,
      name: 'Tenth location',
      address1: '10 Rue de la Cathédrale',
      postcode: '76000',
      phone: '0223456710',
      city: 'Rouen',
      longitude: 1.1,
      latitude: 49.44,
      filterTypes: ['forest'],
    },
    {
      id: 11,
      name: 'Eleventh location',
      address1: '11 Place de la Bourse',
      postcode: '13001',
      phone: '0423456711',
      city: 'Marseille',
      longitude: 5.37,
      latitude: 43.3,
      filterTypes: ['location'],
    },
    {
      id: 12,
      name: 'Twelfth location',
      address1: '12 Avenue des Fleurs',
      postcode: '34000',
      phone: '0467456712',
      city: 'Montpellier',
      longitude: 3.87,
      latitude: 43.61,
      filterTypes: ['location', 'forest'],
    },
    {
      id: 13,
      name: 'Thirteenth location',
      address1: '13 Rue du Palais',
      postcode: '35000',
      phone: '0223456713',
      city: 'Rennes',
      longitude: -1.68,
      latitude: 48.11,
      filterTypes: ['forest'],
    },
    {
      id: 14,
      name: 'Fourteenth location',
      address1: '14 Grand-Place',
      postcode: '63000',
      phone: '0473456714',
      city: 'Clermont-Ferrand',
      longitude: 3.08,
      latitude: 45.78,
      filterTypes: ['location'],
    },
    {
      id: 15,
      name: 'Fifteenth location',
      address1: '15 Esplanade de la Défense',
      postcode: '92400',
      phone: '0123456715',
      city: 'Courbevoie',
      longitude: 2.24,
      latitude: 48.9,
      filterTypes: ['location', 'forest'],
    },
    {
      id: 16,
      name: 'Sixteenth location',
      address1: '16 Quai des Pontonniers',
      postcode: '67000',
      phone: '0388456716',
      city: 'Strasbourg',
      longitude: 7.73,
      latitude: 48.58,
      filterTypes: ['forest'],
    },
    {
      id: 17,
      name: 'Seventeenth location',
      address1: '17 Rue du Château',
      postcode: '21000',
      phone: '0380456717',
      city: 'Dijon',
      longitude: 5.04,
      latitude: 47.32,
      filterTypes: ['location'],
    },
    {
      id: 18,
      name: 'Eighteenth location',
      address1: '18 Avenue de la Gare',
      postcode: '54000',
      phone: '0383456718',
      city: 'Nancy',
      longitude: 6.18,
      latitude: 48.69,
      filterTypes: ['location', 'forest'],
    },
    {
      id: 19,
      name: 'Nineteenth location',
      address1: '19 Place de la République',
      postcode: '25000',
      phone: '0381456719',
      city: 'Besançon',
      longitude: 6.02,
      latitude: 47.24,
      filterTypes: ['forest'],
    },
    {
      id: 20,
      name: 'Twentieth location',
      address1: '20 Rue de Bretagne',
      postcode: '49000',
      phone: '0241456720',
      city: 'Angers',
      longitude: -0.55,
      latitude: 47.47,
      filterTypes: ['location'],
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

  // Switch pagination mode via ?paginationMode=infinite (or =scroll, =both) in the URL.
  const paginationModeParam = searchParams.get('paginationMode') ?? 'numbered';
  const isInfinite = paginationModeParam !== 'numbered';
  const paginationProvider = new AdvancedPagination({
    mode: isInfinite ? 'infinite' : 'numbered',
    itemsPerPage: 3,
    siblingCount: 1,
    boundaryCount: 1,
    showPrevNext: true,
    showFirstLast: true,
    showStatus: true,
    statusText: 'Showing [start]–[end] of [total] locations',
    scrollToTopOnPageChange: true,
    ...(isInfinite && {
      infiniteMode: (paginationModeParam === 'scroll' || paginationModeParam === 'both')
        ? (paginationModeParam as 'scroll' | 'both')
        : 'button',
      loadMoreText: 'Load more locations',
    }),
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
