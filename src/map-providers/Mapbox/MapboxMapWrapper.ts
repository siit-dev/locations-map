import type { GoogleIcon, LocationsMap, MapMarkerInterface, MapPositionInterface } from '../..';
import type MapsWrapperInterface from '../MapsWrapperInterface';
import type { MapSettingsInterface } from '../MapsWrapperInterface';

export interface MapboxMapInstance {
  panTo: (lngLat: { lat: number; lng: number }) => unknown;
  setZoom: (zoom: number) => unknown;
  fitBounds: (bounds: unknown, options?: Record<string, any>) => unknown;
  addLayer: (layer: Record<string, any>) => unknown;
  addSource: (id: string, source: Record<string, any>) => unknown;
  easeTo: (options: Record<string, any>) => unknown;
  getLayer: (id: string) => unknown;
  getSource: (id: string) => unknown;
  isStyleLoaded?: () => boolean;
  on: (type: string, listener: (...args: any[]) => void) => unknown;
  off?: (type: string, listener: (...args: any[]) => void) => unknown;
  once: (type: string, listener: (...args: any[]) => void) => unknown;
  remove?: () => unknown;
  querySourceFeatures: (sourceId: string) => Array<MapboxGeoJSONFeature>;
}

export interface MapboxMarkerInstance {
  addTo: (map: MapboxMapInstance) => this;
  getElement: () => HTMLElement;
  getLngLat: () => unknown;
  setLngLat: (lngLat: { lat: number; lng: number } | [number, number]) => this;
  setOffset: (offset: [number, number]) => this;
  setPopup: (popup?: MapboxPopupInstance | null) => this;
  remove: () => this;
}

export interface MapboxPopupInstance {
  addTo: (map: MapboxMapInstance) => this;
  remove: () => this;
  setHTML: (html: string) => this;
  setLngLat: (lngLat: unknown) => this;
  once: (type: string, listener: () => void) => this;
}

export interface MapboxGLModule {
  accessToken?: string;
  Map: new (options: Record<string, any>) => MapboxMapInstance;
  Marker: new (options?: Record<string, any>) => MapboxMarkerInstance;
  Popup: new (options?: Record<string, any>) => MapboxPopupInstance;
  LngLatBounds: new () => {
    extend: (lngLat: unknown) => unknown;
  };
}

export interface MapboxGeoJSONFeature {
  geometry?: {
    type?: string;
    coordinates?: [number, number] | number[];
  };
  properties?: Record<string, any>;
}

export interface MapboxGeoJSONSource {
  setData: (data: Record<string, any>) => unknown;
  getClusterExpansionZoom: (
    clusterId: number,
    callback: (error?: Error | null, zoom?: number | null) => void,
  ) => unknown;
}

export interface MapboxApiSettingsInterface {
  accessToken: string;
  style?: string;
  [key: string]: any;
}

export interface MapboxSettingsInterface extends MapSettingsInterface {
  apiSettings?: MapboxApiSettingsInterface;
  mapSettings?: Record<string, any>;
  markerSettings?: Record<string, any>;
  popupSettings?: Record<string, any>;
  mapboxgl: MapboxGLModule;
}

export type MapboxMapOptions = MapboxSettingsInterface;

interface IconDescriptor {
  element?: HTMLElement;
  width?: number;
  height?: number;
  anchor?: [number, number];
}

type MapboxIconLike = Record<string, any>;

type MapboxListener = {
  type: string;
  listener: (...args: any[]) => void;
};

export default class MapboxMapWrapper implements MapsWrapperInterface {
  map?: MapboxMapInstance;
  mapMarkers?: MapboxMarkerInstance[] = [];
  settings: MapboxSettingsInterface;
  infoWindow?: MapboxPopupInstance;
  parent?: LocationsMap | null = null;
  protected mapboxgl?: MapboxGLModule;
  protected markerDisplayValues = new WeakMap<object, string>();
  protected mapListeners: MapboxListener[] = [];
  protected markerPopups: MapboxPopupInstance[] = [];

  constructor(settings: MapboxSettingsInterface) {
    if (!settings.mapboxgl) {
      throw new Error(
        'Missing Mapbox GL instance. Pass the imported mapbox-gl module as "mapboxgl" in the Mapbox settings.',
      );
    }
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
        callback((marker as any)['originalSettings']);
      }),
    );
    return this;
  }

  displayMarkerTooltip(marker: MapMarkerInterface, content: string): this {
    if (!this.map || !this.mapboxgl) {
      throw new Error('Map not initialized');
    }

    const mapMarker = this.findMapMarker(marker);
    const lngLat = mapMarker
      ? mapMarker.getLngLat()
      : {
          lng: parseFloat(marker.longitude.toString()),
          lat: parseFloat(marker.latitude.toString()),
        };

    const popupSettings = {
      ...(this.settings.popupSettings || {}),
    };
    if (!Object.prototype.hasOwnProperty.call(popupSettings, 'offset')) {
      const popupOffset = this.getMarkerOffset(this.getMarkerIconDescriptor(marker));
      if (popupOffset) {
        popupSettings.offset = popupOffset;
      }
    }
    this.infoWindow =
      this.infoWindow ||
      new this.mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        ...popupSettings,
      });

    this.infoWindow
      .setLngLat(lngLat)
      .setHTML(content || marker.popup || '')
      .addTo(this.map);

    this.infoWindow.once('close', () => this.parent?.dispatchEvent?.('closedPopup'));
    return this;
  }

  closeMarkerTooltip(): this {
    if (this.infoWindow) {
      const infoWindow = this.infoWindow;
      this.infoWindow = undefined;
      infoWindow.remove();
    }
    return this;
  }

  /** Release provider-owned resources before replacing the Mapbox instance. */
  protected removeMapResources(): void {
    this.closeMarkerTooltip();
    this.removeMapMarkers();
    this.clearAdditionalMarkers();

    this.mapListeners.forEach(({ type, listener }) => this.map?.off?.(type, listener));
    this.mapListeners = [];
    this.map?.remove?.();
    this.map = undefined;
    this.markerDisplayValues = new WeakMap<object, string>();
  }

  /** Hook for wrappers that own additional markers or source state. */
  protected clearAdditionalMarkers(): void {
    return;
  }

  protected removeMapMarkers(): void {
    this.markerPopups.forEach(popup => popup.remove());
    this.markerPopups = [];
    this.mapMarkers?.forEach(marker => marker.remove());
    this.mapMarkers = [];
  }

  protected addMapListener(type: string, listener: (...args: any[]) => void): void {
    if (!this.map) {
      return;
    }

    this.map.on(type, listener);
    this.mapListeners.push({ type, listener });
  }

  protected addMapOnceListener(type: string, listener: (...args: any[]) => void): void {
    if (!this.map) {
      return;
    }

    this.map.once(type, listener);
    this.mapListeners.push({ type, listener });
  }

  protected getMapboxSettings(): Record<string, any> {
    if (!this.settings.apiSettings) {
      throw new Error('Missing Mapbox API settings');
    }

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
    if (!this.settings.mapboxgl) {
      throw new Error(
        'Missing Mapbox GL instance. Pass the imported mapbox-gl module as "mapboxgl" in the Mapbox settings.',
      );
    }

    const mapElement = document.getElementById(elementId);
    if (!mapElement) {
      throw new Error(`Missing map element with id ${elementId}`);
    }

    this.removeMapResources();
    mapElement.innerHTML = '';
    this.mapboxgl = this.settings.mapboxgl;
    this.map = new this.mapboxgl.Map({
      container: mapElement,
      ...this.getMapboxSettings(),
    });

    return this.map;
  }

  createMapMarker(marker: MapMarkerInterface, hasClusters: boolean = false): MapboxMarkerInstance {
    if (!this.map || !this.mapboxgl) {
      throw new Error('Map not initialized');
    }

    const iconDescriptor = this.getMarkerIconDescriptor(marker);
    const markerOptions: Record<string, any> = {
      ...(this.settings.markerSettings || {}),
    };
    if (iconDescriptor.element) {
      markerOptions.element = iconDescriptor.element;
    } else if (typeof HTMLElement !== 'undefined' && markerOptions.element instanceof HTMLElement) {
      markerOptions.element = markerOptions.element.cloneNode(true);
    }
    const offset = this.getMarkerOffset(iconDescriptor);
    if (offset && !markerOptions.offset) {
      markerOptions.offset = offset;
    }

    const mapMarker = new this.mapboxgl.Marker(markerOptions).setLngLat({
      lng: parseFloat(marker.longitude.toString()),
      lat: parseFloat(marker.latitude.toString()),
    });

    if (!hasClusters) {
      mapMarker.addTo(this.map);
    }

    this.markerDisplayValues.set(mapMarker, mapMarker.getElement().style.display);

    (mapMarker as any).originalSettings = marker;

    if (marker.popup) {
      const popupSettings = {
        ...(this.settings.popupSettings || {}),
      };
      if (!Object.prototype.hasOwnProperty.call(popupSettings, 'offset')) {
        const popupOffset = this.getMarkerOffset(iconDescriptor);
        if (popupOffset) {
          popupSettings.offset = popupOffset;
        }
      }
      const infoWindow = new this.mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        ...popupSettings,
      }).setHTML(marker.popup);
      mapMarker.setPopup(infoWindow);
      this.markerPopups.push(infoWindow);
    }

    return mapMarker;
  }

  addMapMarkers(markers: MapMarkerInterface[]): this {
    this.removeMapMarkers();
    this.mapMarkers = markers.map(marker => this.createMapMarker(marker, false));
    return this;
  }

  getMarkerIcon(marker: MapMarkerInterface, selected: boolean = false): HTMLElement | undefined {
    return this.getMarkerIconDescriptor(marker, selected).element;
  }

  protected getMarkerIconDescriptor(marker: MapMarkerInterface, selected: boolean = false): IconDescriptor {
    if (!marker.location) {
      return {};
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
      return {};
    }

    if (typeof icon === 'string') {
      if (/^\s*</.test(icon)) {
        return this.createHtmlIconDescriptor({ html: icon });
      }
      return this.createImageIconDescriptor({ url: icon });
    }

    if (typeof HTMLElement !== 'undefined' && icon instanceof HTMLElement) {
      return {
        element: this.createMarkerElement(icon.cloneNode(true) as HTMLElement),
      };
    }

    if (typeof icon !== 'object') {
      return {};
    }

    const genericIcon = icon as GoogleIcon & MapboxIconLike;
    const iconOptions =
      genericIcon.options && typeof genericIcon.options === 'object'
        ? { ...genericIcon.options, ...genericIcon }
        : genericIcon;
    const url = iconOptions.url || iconOptions.iconUrl;

    if (typeof url === 'string' && url) {
      return this.createImageIconDescriptor({
        url,
        size: iconOptions.scaledSize || iconOptions.size || iconOptions.iconSize,
        width: iconOptions.width,
        height: iconOptions.height,
        anchor: iconOptions.anchor || iconOptions.iconAnchor,
      });
    }

    const html = iconOptions.html;
    if (typeof html === 'string' || (typeof HTMLElement !== 'undefined' && html instanceof HTMLElement)) {
      return this.createHtmlIconDescriptor({
        html,
        className: iconOptions.className,
        size: iconOptions.iconSize || iconOptions.size,
        width: iconOptions.width,
        height: iconOptions.height,
        anchor: iconOptions.anchor || iconOptions.iconAnchor,
      });
    }

    // Google Symbol/path icons have no portable DOM representation. Let Mapbox
    // create its normal marker rather than rendering an incomplete icon.
    return {};
  }

  protected createImageIconDescriptor(icon: {
    url: string;
    size?: any;
    width?: number;
    height?: number;
    anchor?: any;
  }): IconDescriptor {
    const width = this.getDimensionValue(icon.size, 'width') || icon.width;
    const height = this.getDimensionValue(icon.size, 'height') || icon.height;
    const image = document.createElement('img');
    image.src = icon.url;
    image.alt = '';
    image.decoding = 'async';
    image.draggable = false;
    if (width) {
      image.width = width;
    }
    if (height) {
      image.height = height;
    }

    const element = this.createMarkerElement(image, width, height);
    return {
      element,
      width,
      height,
      anchor: this.getAnchorValue(icon.anchor),
    };
  }

  protected createHtmlIconDescriptor(icon: {
    html: string | HTMLElement;
    className?: string;
    size?: any;
    width?: number;
    height?: number;
    anchor?: any;
  }): IconDescriptor {
    const width = this.getDimensionValue(icon.size, 'width') || icon.width;
    const height = this.getDimensionValue(icon.size, 'height') || icon.height;
    const child = document.createElement('div');
    if (icon.className) {
      child.className = icon.className;
    }
    if (typeof icon.html === 'string') {
      child.innerHTML = icon.html;
    } else {
      child.appendChild(icon.html.cloneNode(true));
    }

    const element = this.createMarkerElement(child, width, height);
    return {
      element,
      width,
      height,
      anchor: this.getAnchorValue(icon.anchor),
    };
  }

  protected createMarkerElement(child: HTMLElement, width?: number, height?: number): HTMLElement {
    const element = document.createElement('div');
    element.className = 'locations-mapbox-marker';
    child.dataset.locationsMapboxMarkerContent = 'true';
    element.style.lineHeight = '0';
    element.style.cursor = 'pointer';
    if (width) {
      element.style.width = `${width}px`;
      element.dataset.locationsMapboxOwnedWidth = 'true';
    }
    if (height) {
      element.style.height = `${height}px`;
      element.dataset.locationsMapboxOwnedHeight = 'true';
    }
    element.appendChild(child);
    return element;
  }

  protected updateMarkerIcon(
    mapMarker: MapboxMarkerInstance,
    marker: MapMarkerInterface,
    selected: boolean = false,
  ): void {
    const iconDescriptor = this.getMarkerIconDescriptor(marker, selected);
    if (!iconDescriptor.element) {
      return;
    }

    const element = mapMarker.getElement();
    const currentContent = Array.from(element.children).find(
      child => child instanceof HTMLElement && child.dataset.locationsMapboxMarkerContent === 'true',
    );
    const nextContent = Array.from(iconDescriptor.element.children).find(
      child => child instanceof HTMLElement && child.dataset.locationsMapboxMarkerContent === 'true',
    );
    if (nextContent) {
      const replacement = nextContent.cloneNode(true);
      if (currentContent) {
        currentContent.replaceWith(replacement);
      } else {
        element.appendChild(replacement);
      }
    }

    if (iconDescriptor.width) {
      element.style.width = `${iconDescriptor.width}px`;
      element.dataset.locationsMapboxOwnedWidth = 'true';
    } else if (element.dataset.locationsMapboxOwnedWidth === 'true') {
      element.style.removeProperty('width');
      delete element.dataset.locationsMapboxOwnedWidth;
    }
    if (iconDescriptor.height) {
      element.style.height = `${iconDescriptor.height}px`;
      element.dataset.locationsMapboxOwnedHeight = 'true';
    } else if (element.dataset.locationsMapboxOwnedHeight === 'true') {
      element.style.removeProperty('height');
      delete element.dataset.locationsMapboxOwnedHeight;
    }

    const offset = this.getMarkerOffset(iconDescriptor);
    if (offset) {
      mapMarker.setOffset(offset);
    }
  }

  protected getDimensionValue(value: any, axis: 'width' | 'height'): number | undefined {
    if (!value) {
      return undefined;
    }

    const index = axis === 'width' ? 0 : 1;
    const objectKey = axis === 'width' ? 'width' : 'height';
    const pointKey = axis === 'width' ? 'x' : 'y';

    if (Array.isArray(value) && typeof value[index] === 'number') {
      return value[index];
    }

    if (typeof value[objectKey] === 'number') {
      return value[objectKey];
    }

    if (typeof value[pointKey] === 'number') {
      return value[pointKey];
    }

    return undefined;
  }

  protected getAnchorValue(value: any): [number, number] | undefined {
    const x = this.getDimensionValue(value, 'width');
    const y = this.getDimensionValue(value, 'height');
    return typeof x === 'number' && typeof y === 'number' ? [x, y] : undefined;
  }

  protected getMarkerOffset(iconDescriptor: IconDescriptor): [number, number] | undefined {
    if (
      !iconDescriptor.anchor ||
      typeof iconDescriptor.width !== 'number' ||
      typeof iconDescriptor.height !== 'number'
    ) {
      return undefined;
    }

    return [iconDescriptor.width / 2 - iconDescriptor.anchor[0], iconDescriptor.height / 2 - iconDescriptor.anchor[1]];
  }

  protected findMapMarker(marker: MapMarkerInterface): MapboxMarkerInstance | undefined {
    return this.mapMarkers?.find(
      mapMarker => (mapMarker as any)['originalSettings']?.location?.id == marker.location?.id,
    );
  }

  /**
   * highlight a selected marker
   */
  highlightMapMarker(marker: MapMarkerInterface): this {
    this.mapMarkers?.forEach(mapMarker => {
      if ((mapMarker as any).originalSettings?.location?.id == marker.location?.id) {
        if (this.settings.icon) {
          this.updateMarkerIcon(mapMarker, marker, true);
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
        this.updateMarkerIcon(mapMarker, (mapMarker as any).originalSettings);
      });
    }
    return this;
  }

  filterMarkers(callback: (marker: MapMarkerInterface) => boolean): this {
    this.mapMarkers?.forEach(mapMarker => {
      const isVisible = callback((mapMarker as any)['originalSettings']);
      mapMarker.getElement().style.display = isVisible ? (this.markerDisplayValues.get(mapMarker) ?? '') : 'none';
    });
    return this;
  }

  protected restoreMarkerDisplay(mapMarker: MapboxMarkerInstance): void {
    mapMarker.getElement().style.display = this.markerDisplayValues.get(mapMarker) ?? '';
  }

  getMap() {
    return this.map;
  }

  getMapMarkers(): MapboxMarkerInstance[] {
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
    if (!this.map || !this.mapboxgl || !this.mapMarkers?.length) {
      return this;
    }

    const bounds = new this.mapboxgl.LngLatBounds();
    this.mapMarkers.forEach(marker => {
      bounds.extend(marker.getLngLat());
    });
    this.map.fitBounds(bounds, {
      padding: 50,
    });
    return this;
  }
}
