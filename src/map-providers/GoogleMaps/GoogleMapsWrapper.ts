import { loadGoogleMapsAPI } from './google-maps-loader';
import MapsWrapperInterface, {
  MapPositionInterface,
  MapMarkerInterface,
  MapSettingsInterface,
} from '../MapsWrapperInterface';
import LocationsMap from '../../LocationsMap';
import { GoogleMapsAPIOptions } from './google-maps-loader';
import { GoogleInfoWindow, MapOptions, GoogleMarker, GoogleMap, GoogleIcon } from '../..';

export interface GoogleMapSettingsInterface extends MapSettingsInterface {
  apiSettings?: GoogleMapsAPIOptions;
  mapSettings?: MapOptions;
}

type GoogleMarkerWithSettings = GoogleMarker & {
  originalSettings?: MapMarkerInterface;
};

type MarkerClickCallback = (marker: MapMarkerInterface) => void;

export default class GoogleMapsWrapper implements MapsWrapperInterface {
  map?: GoogleMap;
  mapMarkers?: GoogleMarkerWithSettings[] = [];
  settings: GoogleMapSettingsInterface;
  infoWindow?: GoogleInfoWindow;
  parent?: LocationsMap | null = null;
  protected markerClickCallbacks = new Set<MarkerClickCallback>();
  protected markerClickListeners = new WeakMap<GoogleMarker, Set<MarkerClickCallback>>();
  protected markerListeners = new WeakMap<GoogleMarker, google.maps.MapsEventListener[]>();
  protected markerInfoWindows = new WeakMap<GoogleMarker, GoogleInfoWindow>();

  constructor(settings: GoogleMapSettingsInterface = {}) {
    this.settings = settings;
  }

  setParent(parent: LocationsMap): this {
    this.parent = parent;
    return this;
  }

  addMarkerHoverCallback(fn: Function) {
    return this;
  }

  addMarkerClickCallback(callback: (marker: MapMarkerInterface) => void): this {
    this.markerClickCallbacks.add(callback);
    this.mapMarkers?.forEach(marker => this.attachMarkerClickCallback(marker, callback));
    return this;
  }

  protected attachMarkerClickCallback(marker: GoogleMarker, callback: MarkerClickCallback): void {
    const callbacks = this.markerClickListeners.get(marker) || new Set<MarkerClickCallback>();
    if (callbacks.has(callback)) {
      return;
    }

    this.addMarkerListener(marker, () => {
      const originalSettings = (marker as GoogleMarkerWithSettings).originalSettings;
      if (originalSettings) {
        callback(originalSettings);
      }
    });
    callbacks.add(callback);
    this.markerClickListeners.set(marker, callbacks);
  }

  protected addMarkerListener(marker: GoogleMarker, listener: () => void): void {
    const listeners = this.markerListeners.get(marker) || [];
    listeners.push(marker.addListener('click', listener));
    this.markerListeners.set(marker, listeners);
  }

  protected removeMapMarkers(): void {
    this.closeMarkerTooltip();
    this.mapMarkers?.forEach(marker => {
      this.markerListeners.get(marker)?.forEach(listener => listener.remove());
      this.markerInfoWindows.get(marker)?.close();
      if (marker.getMap?.() !== null) {
        marker.setMap(null);
      }
    });
    this.mapMarkers = [];
  }

  protected hasSameMarkerIdentity(
    originalSettings: MapMarkerInterface | undefined,
    marker: MapMarkerInterface,
  ): boolean {
    const originalId = originalSettings?.location?.id;
    const markerId = marker.location?.id;
    return originalId != null && markerId != null && originalId == markerId;
  }

  displayMarkerTooltip(marker: MapMarkerInterface, content: string): this {
    const mapMarker = this.mapMarkers?.find(mapMarker =>
      this.hasSameMarkerIdentity(mapMarker.originalSettings, marker),
    );
    this.infoWindow = this.infoWindow || new google.maps.InfoWindow();
    this.infoWindow.setContent(content || marker.popup);
    this.infoWindow.open(this.map, mapMarker);
    this.infoWindow.addListener('closeclick', () => this.parent?.dispatchEvent('closedPopup'));
    return this;
  }

  closeMarkerTooltip(): this {
    if (this.infoWindow) {
      this.infoWindow.close();
    }
    return this;
  }

  async initializeMap(
    elementId: string = 'map',
    settings: GoogleMapSettingsInterface = {
      latitude: 0,
      longitude: 0,
      icon: null,
    },
  ) {
    if (!this.parent) {
      throw new Error('Missing parent LocationsMap');
    }
    this.settings = { ...settings, ...this.settings };
    if (!this.settings.apiSettings) {
      throw new Error('Missing Google Maps API settings');
    }

    await loadGoogleMapsAPI(this.settings.apiSettings);
    const mapElement = document.getElementById(elementId);
    if (!mapElement) {
      throw new Error(`Missing map element with id ${elementId}`);
    }

    this.map = new google.maps.Map(mapElement, {
      center: { lat: this.settings.latitude || 0, lng: this.settings.longitude || 0 },
      zoom: this.settings.zoom,
      gestureHandling: 'greedy',
      streetViewControl: false,
      scrollwheel: false,
      mapTypeControl: false,
      scaleControl: true,
      disableDefaultUI: false,
      fullscreenControl: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      ...(this.settings.mapSettings || {}),
    });

    return this.map;
  }

  createMapMarker(marker: MapMarkerInterface, hasClusters: boolean = false): GoogleMarker {
    const mapMarker: GoogleMarkerWithSettings = new google.maps.Marker({
      position: {
        lat: parseFloat(marker.latitude.toString()),
        lng: parseFloat(marker.longitude.toString()),
      },
      icon: this.getMarkerIcon(marker),
      map: hasClusters ? undefined : this.map,
    });
    mapMarker.originalSettings = marker;
    if (marker.popup) {
      const infoWindow = new google.maps.InfoWindow({
        content: marker.popup,
      });
      this.markerInfoWindows.set(mapMarker, infoWindow);
      this.addMarkerListener(mapMarker, () => {
        infoWindow.open(this.map, mapMarker);
        if (this.settings.icon) {
          mapMarker.setIcon(this.getMarkerIcon(marker, true));
        }
      });
    }
    return mapMarker;
  }

  addMapMarkers(markers: MapMarkerInterface[]): this {
    this.removeMapMarkers();
    this.mapMarkers = markers.map(marker => this.createMapMarker(marker, false));
    this.mapMarkers.forEach(mapMarker => {
      this.markerClickCallbacks.forEach(callback => this.attachMarkerClickCallback(mapMarker, callback));
    });
    return this;
  }

  getMarkerIcon(
    marker: MapMarkerInterface,
    selected: boolean = false,
  ): string | GoogleIcon | google.maps.Symbol | null | undefined {
    if (!marker.location) {
      return null;
    }

    let icon = undefined;
    if (this.settings.icon) {
      if (this.settings.icon instanceof Function) {
        icon = this.settings.icon(marker.location, selected);
      } else {
        icon = this.settings.icon;
      }
    }
    return icon as string | GoogleIcon | google.maps.Symbol | null | undefined;
  }

  /**
   * highlight a selected marker
   */
  highlightMapMarker(marker: MapMarkerInterface): this {
    this.mapMarkers?.forEach(mapMarker => {
      if (this.hasSameMarkerIdentity(mapMarker.originalSettings, marker)) {
        if (this.settings.icon) {
          mapMarker.setIcon(this.getMarkerIcon(marker, true));
        }
      }
    });
    return this;
  }

  /**
   * remove hightlight from all markers
   */
  unhighlightMarkers(): this {
    if (this.settings.icon) {
      this.mapMarkers?.forEach(mapMarker => {
        if (mapMarker.originalSettings) {
          mapMarker.setIcon(this.getMarkerIcon(mapMarker.originalSettings));
        }
      });
    }
    return this;
  }

  filterMarkers(callback: (marker: MapMarkerInterface) => boolean): this {
    this.mapMarkers?.forEach(mapMarker => {
      const originalSettings = mapMarker.originalSettings;
      if (originalSettings) {
        mapMarker.setVisible(callback(originalSettings));
      }
    });
    return this;
  }

  getMap() {
    return this.map;
  }

  getMapMarkers(): GoogleMarker[] {
    return this.mapMarkers || [];
  }

  panTo(position: MapPositionInterface, zoom: number | null | undefined): this {
    this.map?.panTo({
      lat: position.latitude,
      lng: position.longitude,
    });
    if (zoom) {
      setTimeout(() => this.setZoom(zoom), 300);
    }

    return this;
  }

  setZoom(zoom: number): this {
    this.map?.setZoom(zoom);
    return this;
  }

  zoomToContent(): this {
    // Zoom to the bounds of the markers
    const bounds = new google.maps.LatLngBounds();
    this.mapMarkers?.forEach(marker => {
      const position = marker.getPosition();
      if (position) {
        bounds.extend(position);
      }
    });
    this.map?.fitBounds(bounds);
    return this;
  }
}
