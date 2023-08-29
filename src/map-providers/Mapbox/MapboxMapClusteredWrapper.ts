import { MapMarkerInterface, MapSettingsInterface } from '../MapsWrapperInterface';

/// <reference types="leaflet" />
/// <reference types="leaflet.markercluster" />

import L, { MarkerClusterGroup } from 'leaflet';
import 'leaflet.markercluster';
import MapboxMapWrapper from './MapboxMapWrapper';
import ClusteredMapsWrapperInterface from '../ClusteredMapsWrapperInterface';

export default class MapboxMapClusteredWrapper extends MapboxMapWrapper implements ClusteredMapsWrapperInterface {
  clusterer: MarkerClusterGroup | null = null;

  async initializeMap(
    elementId: string = 'map',
    settings: MapSettingsInterface = {
      latitude: 0,
      longitude: 0,
      icon: null,
    },
  ) {
    const map = await super.initializeMap(elementId, settings);

    // Add a marker clusterer to manage the markers.
    map.on('load', () => {
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'locations',
        filter: ['has', 'point_count'],
      });
    });

    return map;
  }

  protected getMapboxSettings() {
    return {
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
      ...super.getMapboxSettings(),
    };
  }
}
