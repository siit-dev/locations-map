/// <reference types="google.maps" />

import { LocationContainerSettings, Position, SearchResult, LocationData } from './types/interfaces.d';
import LocationsMap from './LocationsMap';
import MapsWrapperInterface, { MapMarkerInterface } from './map-providers/MapsWrapperInterface.d';

export { default as default } from './LocationsMap';
export { default as LocationsMap } from './LocationsMap';

export { default as GoogleMapsWrapper } from './map-providers/GoogleMapsWrapper';
export type { GoogleMapSettingsInterface } from './map-providers/GoogleMapsWrapper';
export { default as GoogleMapsClusteredWrapper } from './map-providers/GoogleMapsClusteredWrapper';
export type { GoogleMapClusteredSettingsInterface } from './map-providers/GoogleMapsClusteredWrapper';

export { default as GoogleMapsGeocoderProvider } from './search-providers/GoogleMapsGeocoderProvider';

export { default as LeafletMapsWrapper, default as LeafletMapWrapper } from './map-providers/LeafletMapWrapper';
export {
  default as LeafletMapsClusteredWrapper,
  default as LeafletMapClusteredWrapper,
} from './map-providers/LeafletMapClusteredWrapper';
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
} from './types/interfaces';

export { default as Pagination, defaultSettings as PaginationDefaultSettings } from './pagination-provider/Pagination';
export type { PaginationProvider, PaginationSettings } from './pagination-provider/PaginationProvider.d';

export {
  default as Autocomplete,
  defaultSettings as AutocompleteDefaultSettings,
} from './autocomplete-provider/Autocomplete';
export type { AutocompleteProvider, AutocompleteSetupSettings } from './autocomplete-provider/AutocompleteProvider.d';

export type { SearchResult } from './types/interfaces';
export type { AutocompleteResult } from './types/interfaces';
export type { Position } from './types/interfaces';
export type {
  default as MapsWrapperInterface,
  MapSettingsInterface,
  MapMarkerInterface,
  MapPositionInterface,
} from './map-providers/MapsWrapperInterface';

type MapOptions = google.maps.MapOptions;
type GoogleMap = google.maps.Map;
type GoogleMarker = google.maps.Marker;
type GoogleIcon = google.maps.Icon;
type GoogleInfoWindow = google.maps.InfoWindow;
export type { MapOptions, GoogleMap, GoogleMarker, GoogleInfoWindow, GoogleIcon };

export { distance } from './utils/locations-utils';

declare global {
  interface ElementEventMap {
    'initializing.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      settings: LocationContainerSettings;
    }>;
    'initialized.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      settings: LocationContainerSettings;
    }>;
    'parseLocations.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      locations: LocationData[];
    }>;
    'appliedFilters.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      filters: string[];
    }>;
    'updatedLocations.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      locations: LocationData[];
    }>;
    'updatedLocationListContent.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
    }>;
    'updatedLocationsCount.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      count: number;
      html: string;
      template: HTMLElement | null;
    }>;
    'search.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
    }>;
    'updatingFromSearch.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      result: SearchResult;
    }>;
    'updatedFromSearch.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      result: SearchResult;
    }>;
    'geolocated.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      position: GeolocationPosition;
    }>;
    'showPopup.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      marker: MapMarkerInterface;
      location: LocationData;
      popupHtml: string;
    }>;
    'showPopupOnMap.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      marker: MapMarkerInterface;
      location: LocationData;
      popupHtml: string;
    }>;
    'showPopupOutsideMap.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      marker: MapMarkerInterface;
      location: LocationData;
      popupHtml: string;
    }>;
    'listClick.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      originalEvent: MouseEvent;
      location: LocationData;
      locationId: string;
      mapWrapper: MapsWrapperInterface;
    }>;
    'listHover.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      originalEvent: MouseEvent;
      location: LocationData;
      locationId: string;
      mapWrapper: MapsWrapperInterface;
    }>;
    'updatedMapPosition.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      position: GeolocationPosition | Position;
      firstTime: boolean;
    }>;
    'replaceHTMLPlaceholders.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      html: string;
      location: LocationData;
    }>;
    'generateLocationHTML.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      html: string;
      innerHtml: string;
      isSelected: boolean;
      location: LocationData;
    }>;
    'generateLocationPopupHTML.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      html: string;
      innerHtml: string;
      location: LocationData;
    }>;
    'updatingContent.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      keepPopupsOpen: boolean;
    }>;
    'updatedContent.locationsMap': CustomEvent<{
      locationsMap: LocationsMap;
      keepPopupsOpen: boolean;
    }>;
  }
}
