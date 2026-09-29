import MapsWrapperInterface, {
  MapPositionInterface,
  MapMarkerInterface,
  MapSettingsInterface,
} from '../MapsWrapperInterface';
import LocationsMap from '../../LocationsMap';
import './leaflet.vendor.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

/// <reference types="leaflet" />

import L, { DivIcon, Icon, IconOptions } from 'leaflet';
import { GoogleIcon } from '../..';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type LeafletMarkerWithSettings = L.Marker & {
  originalSettings?: MapMarkerInterface;
};

type MarkerClickCallback = (marker: MapMarkerInterface) => void;

export default class LeafletMapsWrapper implements MapsWrapperInterface {
  map?: L.Map;
  mapMarkers?: LeafletMarkerWithSettings[] = [];
  settings: MapSettingsInterface;
  infoWindow?: L.Popup;
  parent?: LocationsMap | null = null;
  protected markerClickCallbacks = new Set<MarkerClickCallback>();
  protected markerClickListeners = new WeakMap<L.Marker, Set<MarkerClickCallback>>();
  protected markerListeners = new WeakMap<L.Marker, L.LeafletEventHandlerFn[]>();
  protected markerPopups = new WeakMap<L.Marker, L.Popup>();

  constructor(settings: MapSettingsInterface = {}) {
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

  protected attachMarkerClickCallback(marker: L.Marker, callback: MarkerClickCallback): void {
    const callbacks = this.markerClickListeners.get(marker) || new Set<MarkerClickCallback>();
    if (callbacks.has(callback)) {
      return;
    }

    const listener: L.LeafletEventHandlerFn = () => {
      const originalSettings = (marker as LeafletMarkerWithSettings).originalSettings;
      if (originalSettings) {
        callback(originalSettings);
      }
    };
    this.addMarkerListener(marker, listener);
    callbacks.add(callback);
    this.markerClickListeners.set(marker, callbacks);
  }

  protected addMarkerListener(marker: L.Marker, listener: L.LeafletEventHandlerFn): void {
    const listeners = this.markerListeners.get(marker) || [];
    marker.on('click', listener);
    listeners.push(listener);
    this.markerListeners.set(marker, listeners);
  }

  protected removeMapMarkers(): void {
    this.closeMarkerTooltip();
    this.mapMarkers?.forEach(marker => {
      this.markerListeners.get(marker)?.forEach(listener => marker.off('click', listener));
      this.markerPopups.get(marker)?.remove();
      marker.remove();
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
    this.infoWindow =
      this.infoWindow ||
      L.popup({
        offset: L.point(0, -1 * (this.getMarkerIconHeight(marker, true) || 20)),
      });
    this.infoWindow
      .setContent(content || marker.popup || '')
      .setLatLng({
        lat: parseFloat(marker.latitude.toString()),
        lng: parseFloat(marker.longitude.toString()),
      })
      .openOn(this.map!);
    this.infoWindow.on('remove', () => this.parent?.dispatchEvent('closedPopup'));
    return this;
  }

  closeMarkerTooltip(): this {
    if (this.infoWindow) {
      this.infoWindow.remove();
    }
    return this;
  }

  async initializeMap(
    elementId: string = 'map',
    settings: MapSettingsInterface = {
      latitude: 0,
      longitude: 0,
      icon: null,
    },
  ) {
    if (!this.parent) {
      throw new Error('Missing parent LocationsMap');
    }
    this.settings = settings;
    const mapElement = document.getElementById(elementId);
    if (!mapElement) {
      throw new Error(`Map element with id ${elementId} not found`);
    }

    this.map = new L.Map(mapElement, {
      center: [settings.latitude || 0, settings.longitude || 0],
      zoom: settings.zoom,
      maxZoom: 20,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxNativeZoom: 18,
      maxZoom: 24,
    }).addTo(this.map);
    return this.map;
  }

  createMapMarker(marker: MapMarkerInterface): L.Marker {
    const latitude = parseFloat(marker.latitude.toString());
    const longitude = parseFloat(marker.longitude.toString());
    const mapMarker: LeafletMarkerWithSettings = new L.Marker([latitude, longitude]);
    const icon = this.getMarkerIcon(marker);
    if (icon) {
      mapMarker.setIcon(icon);
    }
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    mapMarker.addTo(this.map);
    mapMarker.originalSettings = marker;
    if (marker.popup) {
      const infoWindow: L.Popup = new L.Popup({
        offset: L.point(0, -1 * (this.getMarkerIconHeight(marker, true) || 20)),
      });
      infoWindow.setContent(marker.popup);
      this.markerPopups.set(mapMarker, infoWindow);
      this.addMarkerListener(mapMarker, () => {
        infoWindow.setLatLng([marker.latitude, marker.longitude]).openOn(this.map!);
        if (this.settings.icon) {
          const icon = this.getMarkerIcon(marker, true);
          if (icon) mapMarker.setIcon(icon);
        }
      });
    }
    return mapMarker;
  }

  addMapMarkers(markers: MapMarkerInterface[]): this {
    this.removeMapMarkers();
    this.mapMarkers = markers.map(this.createMapMarker.bind(this));
    this.mapMarkers.forEach(mapMarker => {
      this.markerClickCallbacks.forEach(callback => this.attachMarkerClickCallback(mapMarker, callback));
    });
    return this;
  }

  getMarkerIcon(marker: MapMarkerInterface, selected: boolean = false): DivIcon | Icon<IconOptions> | undefined {
    if (!marker.location) {
      return undefined;
    }

    let icon = undefined;
    if (this.settings.icon) {
      if (this.settings.icon instanceof Function) {
        icon = this.settings.icon(marker.location, selected);
      } else {
        icon = this.settings.icon;
      }
    }

    if (!icon) {
      return undefined;
    }

    if (typeof icon === 'string') {
      return L.icon({
        iconUrl: icon,
      });
    }

    if (typeof icon !== 'object') {
      return undefined;
    }

    if (icon instanceof L.Icon) {
      return icon;
    }

    const genericIcon = icon as IconOptions | GoogleIcon;
    const iconOptions = icon as Partial<IconOptions>;

    if ('url' in genericIcon && !('iconUrl' in iconOptions)) {
      iconOptions.iconUrl = genericIcon.url;
    }

    if (
      'anchor' in genericIcon &&
      !('iconAnchor' in iconOptions) &&
      genericIcon.anchor &&
      'x' in genericIcon.anchor &&
      'y' in genericIcon.anchor
    ) {
      iconOptions.iconAnchor = [genericIcon.anchor.x, genericIcon.anchor.y];
    }

    if (
      'size' in genericIcon &&
      !('iconSize' in iconOptions) &&
      Array.isArray(genericIcon.size) &&
      genericIcon.size.length === 2
    ) {
      iconOptions.iconSize = [genericIcon.size[0] as number, genericIcon.size[1] as number];
    }

    if (!('iconSize' in iconOptions) && 'width' in genericIcon && 'height' in genericIcon) {
      iconOptions.iconSize = [genericIcon.width as number, genericIcon.height as number];
    }

    if (!('iconAnchor' in iconOptions) && 'width' in genericIcon && 'height' in genericIcon) {
      iconOptions.iconAnchor = [(genericIcon.width as number) / 2, (genericIcon.height as number) / 2];
    }

    if (!iconOptions.iconSize || !iconOptions.iconAnchor || !iconOptions.iconUrl) {
      return undefined;
    }

    return L.icon(iconOptions as IconOptions);
  }

  getMarkerIconHeight(marker: MapMarkerInterface, selected: boolean = false): number | undefined {
    if (!marker.location) {
      return undefined;
    }

    let icon = undefined;
    if (this.settings.icon) {
      if (this.settings.icon instanceof Function) {
        icon = this.settings.icon(marker.location, selected);
      } else {
        icon = this.settings.icon;
      }
    }

    if (!icon) {
      return undefined;
    }

    if (typeof icon === 'string') {
      return undefined;
    }

    if (typeof icon !== 'object') {
      return undefined;
    }

    const genericIcon = icon as IconOptions | GoogleIcon;

    if ('size' in genericIcon && Array.isArray(genericIcon.size) && genericIcon.size.length === 2) {
      return genericIcon.size[1] as number;
    }

    if ('height' in genericIcon) {
      return genericIcon.height as number;
    }

    return undefined;
  }

  /**
   * highlight a selected marker
   */
  highlightMapMarker(marker: MapMarkerInterface): this {
    this.mapMarkers?.forEach(mapMarker => {
      if (this.hasSameMarkerIdentity(mapMarker.originalSettings, marker)) {
        if (this.settings.icon) {
          const icon = this.getMarkerIcon(marker, true);
          if (icon) mapMarker.setIcon(icon);
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
          const icon = this.getMarkerIcon(mapMarker.originalSettings);
          if (icon) mapMarker.setIcon(icon);
        }
      });
    }
    return this;
  }

  filterMarkers(callback: (marker: MapMarkerInterface) => boolean): this {
    this.mapMarkers?.forEach(mapMarker => {
      const originalSettings = mapMarker.originalSettings;
      if (originalSettings) {
        const isVisible = callback(originalSettings);
        mapMarker.setOpacity(isVisible ? 1 : 0);
      }
    });
    return this;
  }

  getMap() {
    return this.map;
  }

  getMapMarkers(): L.Marker[] {
    return this.mapMarkers || [];
  }

  panTo(position: MapPositionInterface, zoom: number | null | undefined): this {
    this.map?.flyTo(
      {
        lat: position.latitude,
        lng: position.longitude,
      },
      zoom || undefined,
      {
        duration: 0.3,
      },
    );
    return this;
  }

  setZoom(zoom: number): this {
    this.map?.setZoom(zoom);
    return this;
  }

  zoomToContent(): this {
    const group = L.featureGroup(this.mapMarkers);
    this.map?.fitBounds(group.getBounds().pad(0.5));
    return this;
  }
}
