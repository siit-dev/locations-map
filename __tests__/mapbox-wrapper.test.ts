/// <reference types="jest" />

import MapboxMapWrapper from '../src/map-providers/Mapbox/MapboxMapWrapper';
import { MapMarkerInterface } from '../src/map-providers/MapsWrapperInterface';

class MockMap {
  static instances: MockMap[] = [];
  options: any;
  panTo = jest.fn();
  setZoom = jest.fn();
  fitBounds = jest.fn();

  constructor(options: any) {
    this.options = options;
    MockMap.instances.push(this);
  }
}

class MockMarker {
  static instances: MockMarker[] = [];
  options: any;
  element: HTMLElement;
  lngLat: any;

  constructor(options: any = {}) {
    this.options = options;
    this.element = options.element || document.createElement('div');
    MockMarker.instances.push(this);
  }

  setLngLat(lngLat: any) {
    this.lngLat = lngLat;
    return this;
  }

  addTo() {
    return this;
  }

  getElement() {
    return this.element;
  }

  setPopup() {
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
  setHTML() {
    return this;
  }
}

class MockLngLatBounds {
  extend = jest.fn();
}

const mapboxgl = {
  accessToken: '',
  Map: MockMap,
  Marker: MockMarker,
  Popup: MockPopup,
  LngLatBounds: MockLngLatBounds,
} as any;

const marker: MapMarkerInterface = {
  latitude: 48.8,
  longitude: 2.35,
  location: {
    id: 1,
    latitude: 48.8,
    longitude: 2.35,
  },
};

beforeEach(() => {
  document.body.innerHTML = '<div id="map"></div>';
  MockMap.instances = [];
  MockMarker.instances = [];
});

it('merges constructor settings over runtime settings when initializing Mapbox', async () => {
  const wrapper = new MapboxMapWrapper({
    apiSettings: {
      accessToken: 'token',
      style: 'mapbox://styles/example/style',
    },
    mapSettings: {
      interactive: false,
    },
    mapboxgl,
    zoom: 9,
  });

  wrapper.setParent({} as any);
  await wrapper.initializeMap('map', {
    latitude: 1,
    longitude: 2,
    zoom: 4,
  });

  expect(mapboxgl.accessToken).toBe('token');
  expect(MockMap.instances[0].options.container).toBe(document.getElementById('map'));
  expect(MockMap.instances[0].options.accessToken).toBe('token');
  expect(MockMap.instances[0].options.style).toBe('mapbox://styles/example/style');
  expect(MockMap.instances[0].options.center).toEqual([2, 1]);
  expect(MockMap.instances[0].options.zoom).toBe(9);
  expect(MockMap.instances[0].options.interactive).toBe(false);
});

it('normalizes string icons into Mapbox marker elements', () => {
  const wrapper = new MapboxMapWrapper({
    icon: '/marker.svg',
    mapboxgl,
  });

  const element = wrapper.getMarkerIcon(marker);

  expect(element).toBeInstanceOf(HTMLElement);
  expect(element?.querySelector('img')?.getAttribute('src')).toBe('/marker.svg');
});

it('normalizes Google-style icon objects and marker anchors', async () => {
  const wrapper = new MapboxMapWrapper({
    apiSettings: {
      accessToken: 'token',
    },
    icon: {
      url: '/marker.svg',
      width: 24,
      height: 32,
      anchor: {
        x: 12,
        y: 32,
      },
    },
    mapboxgl,
  });

  wrapper.setParent({} as any);
  await wrapper.initializeMap('map');
  wrapper.createMapMarker(marker);

  const markerOptions = MockMarker.instances[0].options;
  expect(markerOptions.element.querySelector('img')?.getAttribute('src')).toBe('/marker.svg');
  expect(markerOptions.element.style.width).toBe('24px');
  expect(markerOptions.element.style.height).toBe('32px');
  expect(markerOptions.offset).toEqual([0, -16]);
});

it('normalizes HTMLElement icons by cloning them into a stable wrapper', () => {
  const icon = document.createElement('span');
  icon.textContent = 'A';

  const wrapper = new MapboxMapWrapper({
    icon,
    mapboxgl,
  });

  const element = wrapper.getMarkerIcon(marker);

  expect(element).toBeInstanceOf(HTMLElement);
  expect(element?.textContent).toBe('A');
  expect(element?.firstElementChild).not.toBe(icon);
});

it('requires an explicit Mapbox GL instance', () => {
  expect(() => new MapboxMapWrapper({} as any)).toThrow('Missing Mapbox GL instance');
});
