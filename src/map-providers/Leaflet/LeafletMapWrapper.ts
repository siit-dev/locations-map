import MapsWrapperInterface, {
  MapPositionInterface,
  MapMarkerInterface,
  MapSettingsInterface,
} from '../MapsWrapperInterface';
import LocationsMap from '../../LocationsMap';
import 'leaflet/dist/leaflet.css';

/// <reference types="leaflet" />

import L, { DivIcon, Icon, IconOptions } from 'leaflet';
import { GoogleIcon } from '../..';

export default class LeafletMapsWrapper implements MapsWrapperInterface {
  map?: L.Map;
  mapMarkers?: L.Marker[] = [];
  settings: MapSettingsInterface;
  infoWindow?: L.Popup;
  parent?: LocationsMap | null = null;

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
    this.mapMarkers?.forEach(marker =>
      marker.addEventListener('click', () => {
        callback((marker as any)['originalSettings']);
      }),
    );
    return this;
  }

  displayMarkerTooltip(marker: MapMarkerInterface, content: string): this {
    this.infoWindow = this.infoWindow || L.popup();
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
    const mapMarker: L.Marker = new L.Marker([latitude, longitude]);
    const icon = this.getMarkerIcon(marker);
    if (icon) {
      mapMarker.setIcon(icon);
    }
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    mapMarker.addTo(this.map);
    (mapMarker as any).originalSettings = marker;
    if (marker.popup) {
      const infoWindow: L.Popup = new L.Popup();
      infoWindow.setContent(marker.popup);
      mapMarker.addEventListener('click', () => {
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
    this.mapMarkers = markers.map(this.createMapMarker.bind(this));
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

  /**
   * highlight a selected marker
   */
  highlightMapMarker(marker: MapMarkerInterface): this {
    this.mapMarkers?.forEach(mapMarker => {
      if ((mapMarker as any)['originalSettings'].location.id == marker.location?.id) {
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
        const icon = this.getMarkerIcon((mapMarker as any)['originalSettings']);
        if (icon) mapMarker.setIcon(icon);
      });
    }
    return this;
  }

  filterMarkers(callback: (marker: MapMarkerInterface) => boolean): this {
    this.mapMarkers?.forEach(mapMarker => {
      const isVisible = callback((mapMarker as any)['originalSettings']);
      mapMarker.setOpacity(isVisible ? 1 : 0);
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
