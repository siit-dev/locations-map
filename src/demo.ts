import {
  Autocomplete,
  LeafletMapClusteredWrapper,
  LocationContainerSettings,
  LocationsMap,
  NominatimProvider,
  Pagination,
} from '.';
import './scss/main.scss';
import './scss/demo.scss';

document.addEventListener('DOMContentLoaded', () => {
  const locations = [
    {
      id: 1,
      name: 'First location',
      address1: 'Paris',
      postcode: '12345',
      phone: '123456789',
      city: 'Nantes',
      longitude: 44.2,
      latitude: 40.2,
      filterTypes: ['location', 'forest'],
    },
    {
      id: 2,
      name: 'Second location',
      address1: 'Paris',
      postcode: '12345',
      phone: '123456789',
      city: 'Nantes',
      longitude: 44.2,
      latitude: 40.2,
      filterTypes: ['location'],
    },
  ];

  const container = document.querySelector<HTMLElement>('locations-map-container');
  if (!container) {
    throw new Error('Container not found');
  }
  const mapProvider = new LeafletMapClusteredWrapper();
  const searchProvider = new NominatimProvider();
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
    latitude: 44.1,
    longitude: 10.3,
    zoom: 8,
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
