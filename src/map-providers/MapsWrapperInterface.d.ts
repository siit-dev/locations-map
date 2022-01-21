import { Icon, LocationData } from '../interfaces';
import LocationsMap from '../LocationsMap';

export interface MapPositionInterface {
  latitude: number;
  longitude: number;
}

export interface MapMarkerInterface extends MapPositionInterface {
  icon?: string;
  popup?: string;
  location?: LocationData;
}

export interface MapSettingsInterface {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  icon?: Icon;
  [key: string]: any;
}

export default interface MapsWrapperInterface {
  map?: any;
  mapMarkers?: any;
  parent?: LocationsMap;

  initializeMap: (elementId?: string, settings?: MapSettingsInterface) => Promise<any>;
  setParent: (parent: LocationsMap) => this;
  addMapMarkers: (markers: MapMarkerInterface[]) => this;
  addMarkerHoverCallback: (fn: (e: any) => void) => this;
  addMarkerClickCallback: (fn: (marker: MapMarkerInterface) => void) => this;
  filterMarkers(fn: (marker: MapMarkerInterface) => boolean): this;
  highlightMapMarker: (marker: MapMarkerInterface) => this;
  unhighlightMarkers: () => this;

  panTo: (position: MapPositionInterface) => this;
  setZoom: (zoom: number) => this;

  displayMarkerTooltip: (marker: MapMarkerInterface, content: string) => this;
  closeMarkerTooltip: () => this;
}
