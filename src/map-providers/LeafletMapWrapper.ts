import MapsWrapperInterface, {
  MapPositionInterface,
  MapMarkerInterface,
  MapSettingsInterface,
} from './MapsWrapperInterface';
import LocationsMap from '../LocationsMap';

import 'leaflet/dist/leaflet.css';

/// <reference path="./node_modules/@types/leaflet/index.d.ts" />

import L from 'leaflet';

export default class LeafletMapsWrapper implements MapsWrapperInterface {
  map?: L.Map;
  mapMarkers?: L.Marker[];
  settings: MapSettingsInterface;
  infoWindow?: L.Popup;
  parent?: LocationsMap = null;

  constructor(settings?: MapSettingsInterface) {
    this.settings = settings;
  }

  setParent(parent: LocationsMap): this {
    this.parent = parent;
    return this;
  }

  addMarkerHoverCallback(fn) {
    return this;
  }

  addMarkerClickCallback(callback: (marker: MapMarkerInterface) => void): this {
    this.mapMarkers.forEach(marker =>
      marker.addEventListener('click', () => {
        callback(marker['originalSettings']);
      })
    );
    return this;
  }

  displayMarkerTooltip(marker: MapMarkerInterface, content: string): this {
    this.infoWindow = this.infoWindow || L.popup();
    this.infoWindow
      .setContent(content || marker.popup)
      .setLatLng({
        lat: parseFloat(marker.latitude.toString()),
        lng: parseFloat(marker.longitude.toString()),
      })
      .openOn(this.map);
    this.infoWindow.on('remove', () => this.parent.dispatchEvent('closedPopup'));
    return this;
  }

  closeMarkerTooltip(): this {
    if (this.infoWindow) {
      this.infoWindow.closePopup();
    }
    return this;
  }

  async initializeMap(
    elementId: string = 'map',
    settings: MapSettingsInterface = {
      latitude: 0,
      longitude: 0,
      icon: null,
    }
  ) {
    if (!this.parent) {
      throw new Error('Missing parent LocationsMap');
    }
    this.settings = settings;
    this.map = new L.Map(document.getElementById(elementId), {
      center: [settings.latitude, settings.longitude],
      zoom: settings.zoom,
      maxZoom: 20,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    return this.map;
  }

  createMapMarker(marker: MapMarkerInterface): L.Marker {
    const latitude = parseFloat(marker.latitude.toString());
    const longitude = parseFloat(marker.longitude.toString());
    const mapMarker: L.Marker = new L.Marker([latitude, longitude]);
    const icon = this.getMarkerIcon(marker);
    if (icon) {
      mapMarker.setIcon(this.getMarkerIcon(marker));
    }
    mapMarker.addTo(this.map);
    mapMarker['originalSettings'] = marker;
    if (marker.popup) {
      const infoWindow: L.Popup = new L.Popup();
      infoWindow.setContent(marker.popup);
      mapMarker.addEventListener('click', () => {
        infoWindow.setLatLng([marker.latitude, marker.longitude]).openOn(this.map);
        if (this.settings.icon) {
          mapMarker.setIcon(this.getMarkerIcon(marker, true));
        }
      });
    }
    return mapMarker;
  }

  addMapMarkers(markers: MapMarkerInterface[]): this {
    this.mapMarkers = markers.map(this.createMapMarker.bind(this));
    return this;
  }

  getMarkerIcon(marker: MapMarkerInterface, selected: boolean = false) {
    let icon = undefined;
    if (this.settings.icon) {
      if (this.settings.icon instanceof Function) {
        icon = this.settings.icon(marker.location, selected);
      } else {
        icon = this.settings.icon;
      }
    }
    if (!(icon instanceof L.Icon)) {
      icon = icon
        ? L.icon({
            iconUrl: icon.iconUrl || icon.url,
            iconAnchor:
              icon.iconAnchor ||
              (icon.anchor ? [icon.anchor.x, icon.anchor.y] : undefined),
            iconSize: [30, 30],
            ...icon,
          })
        : icon;
    }
    return icon;
  }

  /**
   * highlight a selected marker
   */
  highlightMapMarker(marker: MapMarkerInterface): this {
    this.mapMarkers.forEach(mapMarker => {
      if (mapMarker['originalSettings'].location.id == marker.location.id) {
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
      this.mapMarkers.forEach(mapMarker => {
        mapMarker.setIcon(this.getMarkerIcon(mapMarker['originalSettings']));
      });
    }
    return this;
  }

  filterMarkers(callback: (marker: MapMarkerInterface) => boolean): this {
    this.mapMarkers.forEach(mapMarker => {
      const isVisible = callback(mapMarker['originalSettings']);
      mapMarker.setOpacity(isVisible ? 1 : 0);
    });
    return this;
  }

  getMap() {
    return this.map;
  }

  getMapMarkers(): L.Marker[] {
    return this.mapMarkers;
  }

  panTo(position: MapPositionInterface): this {
    this.map.panTo({
      lat: position.latitude,
      lng: position.longitude,
    });
    return this;
  }

  setZoom(zoom: number): this {
    this.map.setZoom(zoom);
    return this;
  }
}
