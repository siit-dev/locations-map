/// <reference types="google.maps" />

export { default as default } from './LocationsMap';
export { default as LocationsMap } from './LocationsMap';

export { default as GoogleMapsWrapper } from './map-providers/GoogleMapsWrapper';
export type { GoogleMapSettingsInterface } from './map-providers/GoogleMapsWrapper';
export { default as GoogleMapsClusteredWrapper } from './map-providers/GoogleMapsClusteredWrapper';
export type { GoogleMapClusteredSettingsInterface } from './map-providers/GoogleMapsClusteredWrapper';

export { default as GoogleMapsGeocoderProvider } from './search-providers/GoogleMapsGeocoderProvider';

export { default as LeafletMapsWrapper } from './map-providers/LeafletMapWrapper';
export { default as LeafletMapsClusteredWrapper } from './map-providers/LeafletMapClusteredWrapper';
export { default as NominatimProvider } from './search-providers/NominatimProvider';

export type {
  default as ClusteredMapsWrapperInterface,
  ClusteredMapSettingsInterface,
} from './map-providers/ClusteredMapsWrapperInterface';
export type {
  LocationData,
  IndexedLocationData,
  IconCallback,
  Icon,
  LocationContainerSettings,
  SearchProvider,
} from './interfaces';

export {
  default as Pagination,
  defaultSettings as PaginationDefaultSettings,
} from './pagination-provider/Pagination';
export type {
  PaginationProvider,
  PaginationSettings,
} from './pagination-provider/PaginationProvider.d';

export {
  default as Autocomplete,
  defaultSettings as AutocompleteDefaultSettings,
} from './autocomplete-provider/Autocomplete';
export type {
  AutocompleteProvider,
  AutocompleteSetupSettings,
} from './autocomplete-provider/AutocompleteProvider.d';

export type { SearchResult } from './interfaces';
export type { AutocompleteResult } from './interfaces';
export type { Position } from './interfaces';
export type {
  default as MapsWrapperInterface,
  MapSettingsInterface,
  MapMarkerInterface,
  MapPositionInterface,
} from './map-providers/MapsWrapperInterface';

type MapOptions = google.maps.MapOptions;
type GoogleMap = google.maps.Map;
type Marker = google.maps.Marker;
type InfoWindow = google.maps.InfoWindow;
export type { MapOptions, GoogleMap, Marker, InfoWindow };

export { distance } from './utils/locations-utils';
export { dateWithTimeZone } from './utils/locations-utils';
