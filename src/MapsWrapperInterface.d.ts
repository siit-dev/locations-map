import { MarkerClustererOptions } from '@googlemaps/markerclustererplus';
import { Icon, StoreData } from './interfaces';
import StoresMap from './StoresMap';

export interface MapPositionInterface {
  latitude: number;
  longitude: number;
}

export interface MapMarkerInterface extends MapPositionInterface {
  icon?: string;
  popup?: string;
  store?: StoreData;
}

export interface MapSettingsInterface {
  latitude: number;
  longitude: number;
  zoom?: number;
  clusters?: boolean;
  clusterSettings?: MarkerClustererOptions;
  icon?: Icon;
  [key: string]: any;
}

export default interface MapsWrapperInterface {
  map?: any;
  mapMarkers?: any;
  parent: StoresMap;

  initializeMap: (
    elementId?: string,
    settings?: MapSettingsInterface
  ) => Promise<any>;
  addMapMarkers: (markers: MapMarkerInterface[]) => this;
  addMarkerHoverCallback: (fn: (e: any) => void) => this;
  addMarkerClickCallback: (fn: (marker: MapMarkerInterface) => void) => this;
  filterMarkers: (fn: (marker: MapMarkerInterface) => boolean) => this;
  highlightMapMarker: (marker: MapMarkerInterface) => this;
  unhighlightMarkers: () => this;

  panTo: (position: MapPositionInterface) => this;
  setZoom: (zoom: number) => this;

  displayMarkerTooltip: (marker: MapMarkerInterface, content: string) => this;
  closeMarkerTooltip: () => this;
}
