/// <reference types="jest" />

import MapboxMapClusteredWrapper from '../src/map-providers/Mapbox/MapboxMapClusteredWrapper';
import MapboxMapWrapper from '../src/map-providers/Mapbox/MapboxMapWrapper';
import { MapMarkerInterface } from '../src/map-providers/MapsWrapperInterface';

class MockSource {
  data: any;
  setData = jest.fn((data: any) => {
    this.data = data;
    return this;
  });
  getClusterExpansionZoom = jest.fn((_clusterId: number, callback: (error?: Error | null, zoom?: number) => void) => {
    callback(null, 12);
    return this;
  });
}

class MockMap {
  static instances: MockMap[] = [];
  options: any;
  sources: Record<string, MockSource> = {};
  layers: Record<string, any> = {};
  features: any[] = [];
  listeners: Record<string, Array<(...args: any[]) => void>> = {};
  panTo = jest.fn();
  setZoom = jest.fn();
  fitBounds = jest.fn();
  easeTo = jest.fn();
  addLayer = jest.fn((layer: any) => {
    this.layers[layer.id] = layer;
    return this;
  });
  addSource = jest.fn((id: string, settings: any) => {
    const source = new MockSource();
    source.data = settings.data;
    this.sources[id] = source;
    return this;
  });
  getLayer = jest.fn((id: string) => this.layers[id]);
  getSource = jest.fn((id: string) => this.sources[id]);
  on = jest.fn((type: string, listener: (...args: any[]) => void) => {
    this.listeners[type] = [...(this.listeners[type] || []), listener];
    return this;
  });
  once = jest.fn((type: string, listener: (...args: any[]) => void) => {
    this.listeners[type] = [...(this.listeners[type] || []), listener];
    return this;
  });
  off = jest.fn((type: string, listener: (...args: any[]) => void) => {
    this.listeners[type] = (this.listeners[type] || []).filter(current => current !== listener);
    return this;
  });
  remove = jest.fn(() => this);
  querySourceFeatures = jest.fn(() => this.features);

  constructor(options: any) {
    this.options = options;
    MockMap.instances.push(this);
  }

  emit(type: string): void {
    const listeners = [...(this.listeners[type] || [])];
    if (type === 'load') {
      this.listeners[type] = [];
    }
    listeners.forEach(listener => listener());
  }
}

class MockMarker {
  static instances: MockMarker[] = [];
  options: any;
  element: HTMLElement;
  lngLat: any;
  map: any;
  addTo = jest.fn((map: any) => {
    this.map = map;
    return this;
  });
  remove = jest.fn(() => this);

  constructor(options: any = {}) {
    this.options = options;
    this.element = options.element || document.createElement('div');
    MockMarker.instances.push(this);
  }

  setLngLat(lngLat: any) {
    this.lngLat = lngLat;
    return this;
  }

  getElement() {
    return this.element;
  }

  setPopup(popup: any) {
    this.options.popup = popup;
    return this;
  }

  getLngLat() {
    return this.lngLat;
  }

  setOffset(offset: [number, number]) {
    this.options.offset = offset;
    return this;
  }
}

class MockPopup {
  static instances: MockPopup[] = [];
  options: any;
  closeListener?: () => void;
  addTo = jest.fn(() => this);
  remove = jest.fn(() => {
    this.closeListener?.();
    this.closeListener = undefined;
    return this;
  });
  setHTML = jest.fn((_html: string) => this);
  setLngLat = jest.fn((_lngLat: any) => this);
  once = jest.fn((_type: string, listener: () => void) => {
    this.closeListener = listener;
    return this;
  });

  constructor(options: any = {}) {
    this.options = options;
    MockPopup.instances.push(this);
  }
}

class MockLngLatBounds {
  extend = jest.fn();
}

const mapboxgl = {
  Map: MockMap,
  Marker: MockMarker,
  Popup: MockPopup,
  LngLatBounds: MockLngLatBounds,
} as any;

const makeMarker = (id: number, popup?: string): MapMarkerInterface => ({
  latitude: 48.8 + id,
  longitude: 2.35 + id,
  popup,
  location: {
    id,
    latitude: 48.8 + id,
    longitude: 2.35 + id,
  },
});

beforeEach(() => {
  document.body.innerHTML = '<div id="map"></div>';
  MockMap.instances = [];
  MockMarker.instances = [];
  MockPopup.instances = [];
});

const initialize = async (wrapper: MapboxMapWrapper, settings: any = {}) => {
  if (!wrapper.parent) {
    wrapper.setParent({} as any);
  }
  await wrapper.initializeMap('map', { apiSettings: { accessToken: 'token' }, ...settings });
};

it('passes the token per map instance without mutating a readonly ESM module', async () => {
  const readonlyMapboxgl = Object.freeze({
    Map: MockMap,
    Marker: MockMarker,
    Popup: MockPopup,
    LngLatBounds: MockLngLatBounds,
  });
  const wrapper = new MapboxMapWrapper({
    apiSettings: { accessToken: 'token' },
    mapboxgl: readonlyMapboxgl as any,
  });

  await initialize(wrapper, { latitude: 1, longitude: 2, zoom: 4 });

  expect(MockMap.instances[0].options.accessToken).toBe('token');
  expect(MockMap.instances[0].options.style).toBe('mapbox://styles/mapbox/streets-v11');
  expect(MockMap.instances[0].options.center).toEqual([2, 1]);
  expect(MockMap.instances[0].options.zoom).toBe(4);
});

it('removes the previous map, markers, popup, listeners, and DOM before reinitializing', async () => {
  const wrapper = new MapboxMapWrapper({
    apiSettings: { accessToken: 'token' },
    mapboxgl,
  });
  await initialize(wrapper);
  wrapper.addMapMarkers([makeMarker(1, 'Popup')]);
  wrapper.setParent({ dispatchEvent: jest.fn() } as any);
  wrapper.displayMarkerTooltip(makeMarker(1), 'Tooltip');
  const firstMap = MockMap.instances[0];
  const firstMarker = MockMarker.instances[0];

  await wrapper.initializeMap('map');

  expect(firstMap.remove).toHaveBeenCalledTimes(1);
  expect(firstMarker.remove).toHaveBeenCalledTimes(1);
  expect(MockPopup.instances[0].remove).toHaveBeenCalledTimes(1);
  expect(wrapper.getMapMarkers()).toEqual([]);
  expect(MockMap.instances).toHaveLength(2);
});

it('normalizes URL, HTML, Google-style, and Leaflet-style icon forms', () => {
  const marker = makeMarker(1);
  const cases: Array<[any, string]> = [
    ['/marker.svg', '/marker.svg'],
    [{ url: '/google.svg', scaledSize: { width: 24, height: 32 } }, '/google.svg'],
    [{ iconUrl: '/leaflet.svg', iconSize: [20, 30] }, '/leaflet.svg'],
    [{ options: { iconUrl: '/leaflet-structural.svg', iconSize: [12, 14] } }, '/leaflet-structural.svg'],
  ];

  cases.forEach(([icon, expectedUrl]) => {
    const wrapper = new MapboxMapWrapper({ icon, mapboxgl });
    const element = wrapper.getMarkerIcon(marker);
    expect(element?.querySelector('img')?.getAttribute('src')).toBe(expectedUrl);
  });

  const htmlWrapper = new MapboxMapWrapper({
    icon: { html: '<span>HTML marker</span>', iconSize: [18, 20] },
    mapboxgl,
  });
  expect(htmlWrapper.getMarkerIcon(marker)?.textContent).toBe('HTML marker');
  const htmlStringWrapper = new MapboxMapWrapper({ icon: '<span>String HTML</span>', mapboxgl });
  expect(htmlStringWrapper.getMarkerIcon(marker)?.textContent).toBe('String HTML');
});

it('falls back to the default marker for unsupported Google symbols', async () => {
  const wrapper = new MapboxMapWrapper({ icon: { path: 'M0,0' } as any, mapboxgl });
  await initialize(wrapper);
  wrapper.createMapMarker(makeMarker(1));

  expect(MockMarker.instances[0].options.element).toBeUndefined();
});

it('clones consumer elements for every marker', async () => {
  const icon = document.createElement('span');
  icon.textContent = 'A';
  const markerElement = document.createElement('div');
  markerElement.textContent = 'configured';
  markerElement.style.display = 'inline-flex';
  const wrapper = new MapboxMapWrapper({ icon, markerSettings: { element: markerElement }, mapboxgl });
  await initialize(wrapper);
  wrapper.addMapMarkers([makeMarker(1), makeMarker(2)]);

  expect(MockMarker.instances[0].options.element).not.toBe(MockMarker.instances[1].options.element);
  expect(MockMarker.instances[0].options.element.firstElementChild).not.toBe(icon);
  expect(markerElement.parentElement).toBeNull();

  const noIconWrapper = new MapboxMapWrapper({ markerSettings: { element: markerElement }, mapboxgl });
  await initialize(noIconWrapper);
  noIconWrapper.addMapMarkers([makeMarker(3), makeMarker(4)]);
  expect(MockMarker.instances[MockMarker.instances.length - 2]?.options.element).not.toBe(
    MockMarker.instances[MockMarker.instances.length - 1]?.options.element,
  );
});

it('preserves Mapbox root class and positioning styles while highlighting', async () => {
  const wrapper = new MapboxMapWrapper({
    icon: (_location: any, selected: boolean) => ({ url: selected ? '/selected.svg' : '/default.svg' }),
    mapboxgl,
  });
  await initialize(wrapper);
  wrapper.addMapMarkers([makeMarker(1)]);
  const element = MockMarker.instances[0].getElement();
  element.className = 'mapboxgl-marker custom-root';
  element.style.transform = 'translate(10px, 20px)';
  element.style.visibility = 'hidden';
  element.style.display = 'inline-block';

  wrapper.highlightMapMarker(makeMarker(1));
  expect(element.className).toBe('mapboxgl-marker custom-root');
  expect(element.style.transform).toBe('translate(10px, 20px)');
  expect(element.style.visibility).toBe('hidden');
  expect(element.style.display).toBe('inline-block');
  expect(element.querySelector('img')?.getAttribute('src')).toBe('/selected.svg');

  wrapper.unhighlightMarkers();
  expect(element.querySelector('img')?.getAttribute('src')).toBe('/default.svg');
});

it('restores each marker display value after filtering', async () => {
  const markerElement = document.createElement('div');
  markerElement.style.display = 'inline-flex';
  const wrapper = new MapboxMapWrapper({ markerSettings: { element: markerElement }, mapboxgl });
  await initialize(wrapper);
  const first = makeMarker(1);
  const second = makeMarker(2);
  wrapper.addMapMarkers([first, second]);
  wrapper.filterMarkers(marker => marker.location?.id === 2);
  expect(MockMarker.instances[0].getElement().style.display).toBe('none');
  expect(MockMarker.instances[1].getElement().style.display).toBe('inline-flex');
  wrapper.filterMarkers(() => true);
  expect(MockMarker.instances[0].getElement().style.display).toBe('inline-flex');
});

it('applies icon-aware popup offsets while preserving explicit popup settings', async () => {
  const defaultOffsetWrapper = new MapboxMapWrapper({
    icon: { url: '/marker.svg', width: 24, height: 32, anchor: { x: 12, y: 32 } },
    mapboxgl,
  });
  await initialize(defaultOffsetWrapper);
  defaultOffsetWrapper.createMapMarker(makeMarker(1, 'Popup'));
  expect(MockPopup.instances[0].options.offset).toEqual([0, -16]);

  const explicitOffsetWrapper = new MapboxMapWrapper({
    icon: { url: '/marker.svg', width: 24, height: 32, anchor: { x: 12, y: 32 } },
    popupSettings: { offset: [4, 5] },
    mapboxgl,
  });
  await initialize(explicitOffsetWrapper);
  explicitOffsetWrapper.createMapMarker(makeMarker(2, 'Popup'));
  expect(MockPopup.instances[1].options.offset).toEqual([4, 5]);
});

it('keeps marker click, popup close, pan/zoom, and bounds behavior', async () => {
  jest.useFakeTimers();
  const dispatchEvent = jest.fn();
  const wrapper = new MapboxMapWrapper({ mapboxgl });
  wrapper.setParent({ dispatchEvent } as any);
  await initialize(wrapper);
  wrapper.addMapMarkers([makeMarker(1)]);
  const callback = jest.fn();
  wrapper.addMarkerClickCallback(callback);
  MockMarker.instances[0].getElement().dispatchEvent(new MouseEvent('click'));
  expect(callback).toHaveBeenCalledWith(makeMarker(1));

  wrapper.displayMarkerTooltip(makeMarker(1), 'Tooltip');
  wrapper.closeMarkerTooltip();
  expect(dispatchEvent).toHaveBeenCalledWith('closedPopup');

  wrapper.panTo({ latitude: 10, longitude: 20 }, 6);
  expect(MockMap.instances[0].panTo).toHaveBeenCalledWith({ lat: 10, lng: 20 });
  jest.advanceTimersByTime(300);
  expect(MockMap.instances[0].setZoom).toHaveBeenCalledWith(6);
  wrapper.zoomToContent();
  expect(MockMap.instances[0].fitBounds).toHaveBeenCalled();
  jest.useRealTimers();
});

it('keeps the regular Mapbox wrapper unclustered', async () => {
  const wrapper = new MapboxMapWrapper({
    apiSettings: { accessToken: 'token' },
    mapboxgl,
  });
  await initialize(wrapper);
  wrapper.addMapMarkers([makeMarker(1)]);

  expect(MockMap.instances[0].addSource).not.toHaveBeenCalled();
  expect(MockMap.instances[0].addLayer).not.toHaveBeenCalled();
});

it('forces clustering, defers source setup, adds idempotent layers, and updates an existing source', async () => {
  const wrapper = new MapboxMapClusteredWrapper({
    apiSettings: { accessToken: 'token' },
    clusterSettings: { cluster: false, clusterRadius: 40 },
    mapboxgl,
  });
  await initialize(wrapper);
  const map = MockMap.instances[0];
  wrapper.addMapMarkers([makeMarker(1)]);
  wrapper.addMapMarkers([makeMarker(1), makeMarker(2)]);
  expect(map.once).toHaveBeenCalledTimes(1);
  map.emit('load');

  expect(map.addSource).toHaveBeenCalledTimes(1);
  expect(map.sources['locations-mapbox-locations'].data.features).toHaveLength(2);
  expect(map.addSource.mock.calls[0][1].cluster).toBe(true);
  expect(map.addLayer).toHaveBeenCalledTimes(2);
  expect(map.on).toHaveBeenCalledTimes(2);

  wrapper.addMapMarkers([makeMarker(3)]);
  expect(map.addSource).toHaveBeenCalledTimes(1);
  expect(map.sources['locations-mapbox-locations'].setData).toHaveBeenCalled();
  expect(map.addLayer).toHaveBeenCalledTimes(2);
  expect(map.on).toHaveBeenCalledTimes(2);
});

it('deduplicates rendered cluster and point features and removes stale markers', async () => {
  const wrapper = new MapboxMapClusteredWrapper({
    apiSettings: { accessToken: 'token' },
    mapboxgl,
  });
  await initialize(wrapper);
  const map = MockMap.instances[0];
  const point = makeMarker(1);
  wrapper.addMapMarkers([point]);
  map.features = [
    {
      geometry: { type: 'Point', coordinates: [3, 4] },
      properties: { locationId: 1, markerIndex: 0 },
    },
    {
      geometry: { type: 'Point', coordinates: [3, 4] },
      properties: { locationId: 1, markerIndex: 0 },
    },
  ];
  map.emit('load');
  expect(MockMarker.instances[0].addTo).toHaveBeenCalledTimes(1);

  map.features = [
    {
      geometry: { type: 'Point', coordinates: [3, 4] },
      properties: { cluster: true, cluster_id: 9, point_count: 2 },
    },
    {
      geometry: { type: 'Point', coordinates: [3, 4] },
      properties: { cluster: true, cluster_id: 9, point_count: 2 },
    },
  ];
  map.emit('sourcedata');
  expect(MockMarker.instances).toHaveLength(2);
  expect(MockMarker.instances[1].addTo).toHaveBeenCalledTimes(1);
  expect(MockMarker.instances[0].remove).toHaveBeenCalled();

  map.features = [];
  map.emit('sourcedata');
  expect(MockMarker.instances[1].remove).toHaveBeenCalled();
});

it('updates clustered source data when filtering and restores point display', async () => {
  const wrapper = new MapboxMapClusteredWrapper({ apiSettings: { accessToken: 'token' }, mapboxgl });
  await initialize(wrapper);
  const map = MockMap.instances[0];
  const first = makeMarker(1);
  const second = makeMarker(2);
  wrapper.addMapMarkers([first, second]);
  map.features = [
    { geometry: { type: 'Point', coordinates: [1, 2] }, properties: { locationId: 1, markerIndex: 0 } },
    { geometry: { type: 'Point', coordinates: [2, 3] }, properties: { locationId: 2, markerIndex: 1 } },
  ];
  map.emit('load');
  wrapper.filterMarkers(marker => marker.location?.id === 2);

  const source = map.sources['locations-mapbox-locations'];
  expect(source.setData).toHaveBeenCalledWith(
    expect.objectContaining({ features: [expect.objectContaining({ properties: { locationId: 2, markerIndex: 1 } })] }),
  );
  expect(MockMarker.instances[1].getElement().style.display).toBe('');
});

it('only applies inline presentation to the default cluster class', async () => {
  const defaultWrapper = new MapboxMapClusteredWrapper({ apiSettings: { accessToken: 'token' }, mapboxgl });
  await initialize(defaultWrapper);
  const defaultMap = MockMap.instances[0];
  defaultWrapper.addMapMarkers([makeMarker(1)]);
  defaultMap.features = [
    { geometry: { type: 'Point', coordinates: [1, 2] }, properties: { cluster: true, cluster_id: 1, point_count: 2 } },
  ];
  defaultMap.emit('load');
  expect(MockMarker.instances[MockMarker.instances.length - 1]?.getElement().style.background).toBe(
    'rgb(25, 118, 210)',
  );

  const customWrapper = new MapboxMapClusteredWrapper({
    apiSettings: { accessToken: 'token' },
    clusterSettings: { clusterMarkerClassName: 'my-cluster' },
    mapboxgl,
  });
  await initialize(customWrapper);
  const customMap = MockMap.instances[1];
  customWrapper.addMapMarkers([makeMarker(2)]);
  customMap.features = [
    { geometry: { type: 'Point', coordinates: [1, 2] }, properties: { cluster: true, cluster_id: 2, point_count: 3 } },
  ];
  customMap.emit('load');
  const customElement = MockMarker.instances[MockMarker.instances.length - 1]?.getElement();
  expect(customElement?.className).toBe('my-cluster');
  expect(customElement?.getAttribute('style')).toBeNull();
});

it('zooms to a cluster on expansion click', async () => {
  const wrapper = new MapboxMapClusteredWrapper({ apiSettings: { accessToken: 'token' }, mapboxgl });
  await initialize(wrapper);
  const map = MockMap.instances[0];
  wrapper.addMapMarkers([makeMarker(1)]);
  map.features = [
    { geometry: { type: 'Point', coordinates: [5, 6] }, properties: { cluster: true, cluster_id: 7, point_count: 2 } },
  ];
  map.emit('load');
  const clusterElement = MockMarker.instances[MockMarker.instances.length - 1]?.getElement();
  clusterElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(map.easeTo).toHaveBeenCalledWith({ center: [5, 6], zoom: 12 });
});

it('requires an explicit Mapbox GL instance', () => {
  expect(() => new MapboxMapWrapper({} as any)).toThrow('Missing Mapbox GL instance');
});

it('replaces regular markers and attaches callbacks to replacement markers', async () => {
  const wrapper = new MapboxMapWrapper({ apiSettings: { accessToken: 'token' }, mapboxgl });
  await initialize(wrapper);
  const callback = jest.fn();
  wrapper.addMapMarkers([makeMarker(1)]);
  wrapper.addMarkerClickCallback(callback);
  const firstMarker = MockMarker.instances[0];

  wrapper.addMapMarkers([makeMarker(2)]);

  expect(firstMarker.remove).toHaveBeenCalledTimes(1);
  expect(wrapper.getMapMarkers()).toHaveLength(1);
  MockMarker.instances[1].getElement().dispatchEvent(new MouseEvent('click'));
  expect(callback).toHaveBeenCalledWith(makeMarker(2));
  expect(callback).toHaveBeenCalledTimes(1);
});

it('does not match markers when both locations have missing IDs', async () => {
  const wrapper = new MapboxMapWrapper({ apiSettings: { accessToken: 'token' }, mapboxgl });
  await initialize(wrapper);
  const markerWithoutId = { latitude: 1, longitude: 2, location: undefined };
  wrapper.addMapMarkers([markerWithoutId]);

  wrapper.displayMarkerTooltip({ latitude: 9, longitude: 8 }, 'Tooltip');

  expect(MockPopup.instances[0].setLngLat).toHaveBeenCalledWith({ lng: 8, lat: 9 });
});

it('removes a visible clustered point only through managed-marker cleanup', async () => {
  const wrapper = new MapboxMapClusteredWrapper({ apiSettings: { accessToken: 'token' }, mapboxgl });
  await initialize(wrapper);
  const map = MockMap.instances[0];
  const firstMarker = makeMarker(1);
  wrapper.addMapMarkers([firstMarker]);
  map.features = [{ geometry: { type: 'Point', coordinates: [1, 2] }, properties: { locationId: 1, markerIndex: 0 } }];
  map.emit('load');

  const visiblePoint = MockMarker.instances[0];
  wrapper.addMapMarkers([makeMarker(2)]);

  expect(visiblePoint.remove).toHaveBeenCalledTimes(1);
});
