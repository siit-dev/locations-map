import {
  LocationsMap,
  MapMarkerInterface,
  MapOptions,
  MapPositionInterface,
  MapSettingsInterface,
  MapsWrapperInterface,
} from '../..';
import mapboxgl, { MapboxOptions } from 'mapbox-gl';

export interface MapboxMapOptions extends MapSettingsInterface, Partial<MapboxOptions> {}

export interface MapboxSettingsInterface extends MapSettingsInterface {
  apiSettings: {
    accessToken: string;
    style: string;
  };
  mapSettings?: MapboxMapOptions;
}

export default class MapboxMapWrapper implements MapsWrapperInterface {
  map?: mapboxgl.Map;
  mapMarkers?: mapboxgl.Marker[] = [];
  settings: MapboxMapOptions;
  infoWindow?: mapboxgl.Popup;
  parent?: LocationsMap | null = null;

  constructor(settings: MapboxMapOptions) {
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
      marker.getElement().addEventListener('click', () => {
        console.log('marker click', marker, (marker as any)['originalSettings']);
        callback((marker as any)['originalSettings']);
      }),
    );
    return this;
  }

  displayMarkerTooltip(marker: MapMarkerInterface, content: string): this {
    const mapMarker = this.mapMarkers?.find(
      mapMarker => (mapMarker as any)['originalSettings'].location.id == marker.location?.id,
    );
    this.infoWindow =
      this.infoWindow ||
      new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      });
    mapMarker?.setPopup(this.infoWindow);
    this.infoWindow.setHTML(content || marker.popup || '');

    this.infoWindow.once('close', () => this.parent?.dispatchEvent('closedPopup'));

    console.log('displayMarkerTooltip', { marker, content, mapMarker, infoWindow: this.infoWindow });
    return this;
  }

  closeMarkerTooltip(): this {
    if (this.infoWindow) {
      this.infoWindow.remove();
    }
    return this;
  }

  protected getMapboxSettings() {
    return {
      accessToken: this.settings.apiSettings.accessToken,
      style: this.settings.apiSettings.style || 'mapbox://styles/mapbox/streets-v11',
      center: [this.settings.longitude || 0, this.settings.latitude || 0],
      zoom: this.settings.zoom || 0,
      ...(this.settings.mapSettings || {}),
    };
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
    this.settings = { ...settings, ...this.settings };
    if (!this.settings.apiSettings) {
      throw new Error('Missing Mapbox API settings');
    }

    const mapElement = document.getElementById(elementId);
    if (!mapElement) {
      throw new Error(`Missing map element with id ${elementId}`);
    }

    this.map = new mapboxgl.Map({
      container: mapElement.id,
      ...this.getMapboxSettings(),
    });

    return this.map;
  }

  createMapMarker(marker: MapMarkerInterface, hasClusters: boolean = false): mapboxgl.Marker {
    const mapMarker = new mapboxgl.Marker({
      element: this.getMarkerIcon(marker),
    })
      .setLngLat({
        lng: parseFloat(marker.longitude.toString()),
        lat: parseFloat(marker.latitude.toString()),
      })
      .addTo(this.map!);

    (mapMarker as any).originalSettings = marker;

    if (marker.popup) {
      const infoWindow = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      }).setHTML(marker.popup);
      mapMarker.setPopup(infoWindow);
    }

    return mapMarker;
  }

  addMapMarkers(markers: MapMarkerInterface[]): this {
    this.mapMarkers = markers.map(marker => this.createMapMarker(marker, false));
    return this;
  }

  getMarkerIcon(marker: MapMarkerInterface, selected: boolean = false): HTMLElement | undefined {
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
    return icon as HTMLElement | undefined;
  }

  /**
   * highlight a selected marker
   */
  highlightMapMarker(marker: MapMarkerInterface): this {
    this.mapMarkers?.forEach(mapMarker => {
      if ((mapMarker as any).originalSettings.location.id == marker.location?.id) {
        if (this.settings.icon) {
          // mapMarker.set(this.getMarkerIcon(marker, true));
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
        // mapMarker.setIcon(this.getMarkerIcon((mapMarker as any).originalSettings));
      });
    }
    return this;
  }

  filterMarkers(callback: (marker: MapMarkerInterface) => boolean): this {
    this.mapMarkers?.forEach(mapMarker => {
      const isVisible = callback((mapMarker as any)['originalSettings']);
      mapMarker.getElement().style.display = isVisible ? 'block' : 'none';
    });
    return this;
  }

  getMap() {
    return this.map;
  }

  getMapMarkers(): mapboxgl.Marker[] {
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
    const bounds = new mapboxgl.LngLatBounds();
    this.mapMarkers?.forEach(marker => {
      bounds.extend(marker.getLngLat());
    });
    this.map?.fitBounds(bounds, {
      padding: 50,
    });
    return this;
  }
}
