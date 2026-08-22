/// <reference types="jest" />

jest.mock('../src/map-providers/GoogleMaps/google-maps-loader', () => ({
  loadGoogleMapsAPI: jest.fn(() => Promise.resolve()),
}));

class MockGoogleMap {
  static instances: MockGoogleMap[] = [];
  options: unknown;
  constructor(_element: HTMLElement, options: unknown) {
    this.options = options;
    MockGoogleMap.instances.push(this);
  }
  panTo = jest.fn();
  setZoom = jest.fn();
  fitBounds = jest.fn();
}

class MockGoogleMarker {
  static instances: MockGoogleMarker[] = [];
  options: { map?: MockGoogleMap | null; [key: string]: unknown };
  map?: MockGoogleMap | null;
  visible = true;
  icon: unknown;
  listeners: Record<string, Array<() => void>> = {};

  constructor(options: { map?: MockGoogleMap | null; [key: string]: unknown }) {
    this.options = options;
    this.map = options.map;
    this.icon = options.icon;
    MockGoogleMarker.instances.push(this);
  }

  addListener = jest.fn((type: string, listener: () => void) => {
    this.listeners[type] = [...(this.listeners[type] || []), listener];
    return { remove: () => (this.listeners[type] = this.listeners[type].filter(current => current !== listener)) };
  });
  emit(type: string): void {
    [...(this.listeners[type] || [])].forEach(listener => listener());
  }
  setMap = jest.fn((map: MockGoogleMap | null) => {
    this.map = map;
  });
  getMap = jest.fn(() => this.map || null);
  setIcon = jest.fn((icon: unknown) => {
    this.icon = icon;
  });
  setVisible = jest.fn((visible: boolean) => {
    this.visible = visible;
  });
  getPosition = jest.fn(() => null);
}

class MockGoogleInfoWindow {
  close = jest.fn();
  open = jest.fn();
  setContent = jest.fn();
  addListener = jest.fn();
  constructor(_options?: unknown) {}
}

class MockLatLngBounds {
  extend = jest.fn();
}

const mockGoogle = {
  maps: {
    Map: MockGoogleMap,
    Marker: MockGoogleMarker,
    InfoWindow: MockGoogleInfoWindow,
    LatLngBounds: MockLatLngBounds,
    MapTypeId: { ROADMAP: 'roadmap' },
  },
};

jest.mock('@googlemaps/markerclustererplus', () => {
  class MockMarkerClusterer {
    static instances: MockMarkerClusterer[] = [];
    map: MockGoogleMap | null;
    markers: MockGoogleMarker[];
    options: unknown;
    clearMarkers = jest.fn(() => {
      this.markers.forEach(marker => marker.setMap(null));
      this.markers = [];
    });
    setMap = jest.fn((map: MockGoogleMap | null) => {
      this.map = map;
    });
    repaint = jest.fn();

    constructor(map: MockGoogleMap, markers: MockGoogleMarker[], options: unknown) {
      this.map = map;
      this.markers = markers;
      this.options = options;
      markers.forEach(marker => marker.setMap(map));
      MockMarkerClusterer.instances.push(this);
    }
  }

  return { __esModule: true, default: MockMarkerClusterer };
});

class MockLeafletLayer {
  _map?: MockLeafletMap;
  listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

  addTo(map: MockLeafletMap): this {
    map.addLayer(this);
    return this;
  }
  removeFrom(map: MockLeafletMap): this {
    map.removeLayer(this);
    return this;
  }
  remove(): this {
    this._map?.removeLayer(this);
    return this;
  }
  on(type: string, listener: (...args: unknown[]) => void): this {
    this.listeners[type] = [...(this.listeners[type] || []), listener];
    return this;
  }
  off(type: string, listener?: (...args: unknown[]) => void): this {
    if (!listener) {
      this.listeners[type] = [];
    } else {
      this.listeners[type] = (this.listeners[type] || []).filter(current => current !== listener);
    }
    return this;
  }
  emit(type: string): void {
    [...(this.listeners[type] || [])].forEach(listener => listener({}));
  }
}

class MockLeafletMap extends MockLeafletLayer {
  static instances: MockLeafletMap[] = [];
  layers = new Set<MockLeafletLayer>();
  constructor(_element: HTMLElement, _options: unknown) {
    super();
    MockLeafletMap.instances.push(this);
  }
  addLayer(layer: MockLeafletLayer): this {
    this.layers.add(layer);
    layer._map = this;
    return this;
  }
  removeLayer(layer: MockLeafletLayer): this {
    this.layers.delete(layer);
    if (layer._map === this) {
      layer._map = undefined;
    }
    return this;
  }
  hasLayer(layer: MockLeafletLayer): boolean {
    return this.layers.has(layer);
  }
}

class MockLeafletMarker extends MockLeafletLayer {
  static instances: MockLeafletMarker[] = [];
  icon: unknown;
  opacity = 1;
  constructor(public position: [number, number]) {
    super();
    MockLeafletMarker.instances.push(this);
  }
  setIcon = jest.fn((icon: unknown) => {
    this.icon = icon;
    return this;
  });
  setOpacity = jest.fn((opacity: number) => {
    this.opacity = opacity;
    return this;
  });
}

class MockLeafletPopup extends MockLeafletLayer {
  setContent = jest.fn((_content: string) => this);
  setLatLng = jest.fn((_position: unknown) => this);
  openOn = jest.fn((map: MockLeafletMap) => {
    this.addTo(map);
    return this;
  });
}

class MockLeafletIcon {}
class MockLeafletDivIcon extends MockLeafletIcon {}
class MockLeafletDefaultIcon extends MockLeafletIcon {}
(MockLeafletIcon as typeof MockLeafletIcon & { Default: typeof MockLeafletDefaultIcon }).Default =
  MockLeafletDefaultIcon;
(MockLeafletIcon as typeof MockLeafletIcon & { Default: typeof MockLeafletDefaultIcon }).Default.mergeOptions =
  jest.fn();

class MockLeafletClusterGroup extends MockLeafletLayer {
  static instances: MockLeafletClusterGroup[] = [];
  layers = new Set<MockLeafletLayer>();
  constructor(_options?: unknown) {
    super();
    MockLeafletClusterGroup.instances.push(this);
  }
  addLayer = jest.fn((layer: MockLeafletLayer) => {
    this.layers.add(layer);
    return this;
  });
  removeLayer = jest.fn((layer: MockLeafletLayer) => {
    this.layers.delete(layer);
    return this;
  });
  clearLayers = jest.fn(() => {
    this.layers.clear();
    return this;
  });
  refreshClusters = jest.fn();
}

const mockLeaflet = {
  Map: MockLeafletMap,
  Marker: MockLeafletMarker,
  Popup: MockLeafletPopup,
  Icon: MockLeafletIcon,
  DivIcon: MockLeafletDivIcon,
  markerClusterGroup: (options?: unknown) => new MockLeafletClusterGroup(options),
  icon: (options: unknown) => options,
  point: (x: number, y: number) => ({ x, y }),
  tileLayer: () => new MockLeafletLayer(),
  featureGroup: () => ({ getBounds: () => ({ pad: () => ({}) }) }),
};

jest.mock('leaflet', () => ({ __esModule: true, default: mockLeaflet, ...mockLeaflet }));
jest.mock('leaflet.markercluster', () => ({}));
jest.mock('../src/map-providers/Leaflet/leaflet.vendor.css', () => ({}));
jest.mock('leaflet/dist/images/marker-icon.png', () => 'marker-icon');
jest.mock('leaflet/dist/images/marker-icon-2x.png', () => 'marker-icon-2x');
jest.mock('leaflet/dist/images/marker-shadow.png', () => 'marker-shadow');

import GoogleMapsWrapper from '../src/map-providers/GoogleMaps/GoogleMapsWrapper';
import GoogleMapsClusteredWrapper from '../src/map-providers/GoogleMaps/GoogleMapsClusteredWrapper';
import LeafletMapsWrapper from '../src/map-providers/Leaflet/LeafletMapWrapper';
import LeafletMapsClusteredWrapper from '../src/map-providers/Leaflet/LeafletMapClusteredWrapper';
import LocationsMap from '../src/LocationsMap';
import { MapMarkerInterface } from '../src/map-providers/MapsWrapperInterface';
import { LocationData } from '../src/types/interfaces';

const makeMarker = (id: number, type?: string): MapMarkerInterface => ({
  latitude: id,
  longitude: id,
  location: { id, latitude: id, longitude: id, type },
});

const initializeWrapper = async (wrapper: {
  setParent: (parent: any) => unknown;
  initializeMap: (elementId?: string) => Promise<unknown>;
}) => {
  wrapper.setParent({ dispatchEvent: jest.fn() });
  await wrapper.initializeMap('map');
};

beforeEach(() => {
  document.body.innerHTML = '<div id="map"></div>';
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  (globalThis as any).google = mockGoogle;
  MockGoogleMap.instances = [];
  MockGoogleMarker.instances = [];
  MockLeafletMap.instances = [];
  MockLeafletMarker.instances = [];
  MockLeafletClusterGroup.instances = [];
  (jest.requireMock('@googlemaps/markerclustererplus').default as { instances: unknown[] }).instances = [];
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Google marker replacement', () => {
  it('detaches old markers, keeps only the replacement registry, and preserves callbacks', async () => {
    const wrapper = new GoogleMapsWrapper({ apiSettings: { key: 'key' } });
    await initializeWrapper(wrapper);
    const callback = jest.fn();
    wrapper.addMapMarkers([makeMarker(1)]).addMarkerClickCallback(callback);
    const oldMarker = MockGoogleMarker.instances[0];

    wrapper.addMapMarkers([makeMarker(2)]);
    const replacement = MockGoogleMarker.instances[1];
    replacement.emit('click');

    expect(oldMarker.setMap).toHaveBeenCalledWith(null);
    expect(wrapper.getMapMarkers()).toHaveLength(1);
    expect(wrapper.getMapMarkers()[0]).toBe(replacement);
    expect(callback).toHaveBeenCalledWith(makeMarker(2));
    wrapper.filterMarkers(marker => marker.location?.id === 2);
    expect(replacement.setVisible).toHaveBeenCalledWith(true);
  });
});

describe('clustered Google marker replacement', () => {
  it('clears and detaches the previous clusterer before creating one replacement', async () => {
    const wrapper = new GoogleMapsClusteredWrapper({ apiSettings: { key: 'key' } });
    await initializeWrapper(wrapper);
    wrapper.addMapMarkers([makeMarker(1)]);
    const oldClusterer = (jest.requireMock('@googlemaps/markerclustererplus').default as { instances: any[] })
      .instances[0];
    const oldMarker = MockGoogleMarker.instances[0];

    wrapper.addMapMarkers([makeMarker(2)]);

    expect(oldClusterer.clearMarkers).toHaveBeenCalledTimes(1);
    expect(oldClusterer.setMap).toHaveBeenCalledWith(null);
    expect(oldMarker.setMap).toHaveBeenCalledWith(null);
    expect(
      (jest.requireMock('@googlemaps/markerclustererplus').default as { instances: any[] }).instances,
    ).toHaveLength(2);
    expect(wrapper.getMapMarkers()).toHaveLength(1);
    expect(wrapper.clusterer).not.toBe(oldClusterer);
  });
});

describe('Leaflet marker replacement', () => {
  it('removes old markers and keeps filtering and callbacks on the replacement', async () => {
    const wrapper = new LeafletMapsWrapper();
    await initializeWrapper(wrapper);
    const callback = jest.fn();
    wrapper.addMapMarkers([makeMarker(1)]).addMarkerClickCallback(callback);
    const oldMarker = MockLeafletMarker.instances[0];

    wrapper.addMapMarkers([makeMarker(2)]);
    const replacement = MockLeafletMarker.instances[1];
    replacement.emit('click');

    expect(oldMarker._map).toBeUndefined();
    expect(wrapper.getMapMarkers()).toEqual([replacement]);
    expect(callback).toHaveBeenCalledWith(makeMarker(2));
    wrapper.filterMarkers(marker => marker.location?.id === 2);
    expect(replacement.opacity).toBe(1);
  });
});

describe('clustered Leaflet marker replacement', () => {
  it('clears and removes the previous group before creating one replacement group', async () => {
    const wrapper = new LeafletMapsClusteredWrapper();
    await initializeWrapper(wrapper);
    wrapper.addMapMarkers([makeMarker(1)]);
    const oldGroup = MockLeafletClusterGroup.instances[0];
    const oldMarker = MockLeafletMarker.instances[0];

    wrapper.addMapMarkers([makeMarker(2)]);

    expect(oldGroup.clearLayers).toHaveBeenCalledTimes(1);
    expect(oldGroup._map).toBeUndefined();
    expect(oldMarker._map).toBeUndefined();
    expect(MockLeafletClusterGroup.instances).toHaveLength(2);
    expect(wrapper.clusterer).toBe(MockLeafletClusterGroup.instances[1]);
    expect(wrapper.getMapMarkers()).toHaveLength(1);
  });
});

const makeLocationsMapWrapper = (initiallyInitialized: boolean) => {
  let resolveInitialization: (() => void) | undefined;
  const initializeMap = jest.fn(
    () =>
      new Promise<void>(resolve => {
        if (initiallyInitialized) {
          resolve();
        } else {
          resolveInitialization = resolve;
        }
      }),
  );
  const wrapper = {
    map: initiallyInitialized ? {} : undefined,
    initializeMap,
    setParent: jest.fn().mockReturnThis(),
    addMapMarkers: jest.fn().mockReturnThis(),
    addMarkerClickCallback: jest.fn().mockReturnThis(),
    filterMarkers: jest.fn().mockReturnThis(),
    closeMarkerTooltip: jest.fn().mockReturnThis(),
    unhighlightMarkers: jest.fn().mockReturnThis(),
    resolveInitialization: () => {
      wrapper.map = {};
      resolveInitialization?.();
    },
  };
  return wrapper;
};

const makeLocationsMapElement = (): HTMLElement => {
  const element = document.createElement('div');
  element.innerHTML = '<locations-map-target></locations-map-target><locations-map-list></locations-map-list>';
  document.body.appendChild(element);
  return element;
};

describe('LocationsMap location replacement', () => {
  it('recreates initialized markers, reapplies active filters, and does not throw while initializing', async () => {
    const wrapper = makeLocationsMapWrapper(true);
    const initialLocations: LocationData[] = [makeMarker(1).location!];
    const locationsMap = new LocationsMap(makeLocationsMapElement(), {
      locations: initialLocations,
      filters: ['visible'],
      mapProvider: wrapper as any,
      geolocateOnStart: false,
    });
    await Promise.resolve();
    await Promise.resolve();

    const replacementLocations: LocationData[] = [
      { ...makeMarker(2).location!, type: 'hidden' },
      { ...makeMarker(3).location!, type: 'visible' },
    ];
    locationsMap.setLocations(replacementLocations);

    const replacementMarkers = wrapper.addMapMarkers.mock.calls[1][0] as MapMarkerInterface[];
    expect(replacementMarkers.map(marker => marker.location?.id)).toEqual([2, 3]);
    const filter = wrapper.filterMarkers.mock.calls.at(-1)?.[0] as (marker: MapMarkerInterface) => boolean;
    expect(filter(replacementMarkers[0])).toBe(false);
    expect(filter(replacementMarkers[1])).toBe(true);

    const pendingWrapper = makeLocationsMapWrapper(false);
    expect(() =>
      new LocationsMap(makeLocationsMapElement(), {
        locations: initialLocations,
        mapProvider: pendingWrapper as any,
        geolocateOnStart: false,
      }).setLocations(replacementLocations),
    ).not.toThrow();
    expect(pendingWrapper.addMapMarkers).not.toHaveBeenCalled();
    pendingWrapper.resolveInitialization();
    await Promise.resolve();
    await Promise.resolve();
    expect(pendingWrapper.addMapMarkers).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ location: expect.objectContaining({ id: 2 }) })]),
    );
  });
});
