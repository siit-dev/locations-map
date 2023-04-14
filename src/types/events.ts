import {
  LocationContainerSettings,
  LocationData,
  LocationsMap,
  MapMarkerInterface,
  MapsWrapperInterface,
  Position,
  SearchResult,
} from '../index';

export {};

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
