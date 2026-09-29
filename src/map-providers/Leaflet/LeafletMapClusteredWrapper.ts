import { MapMarkerInterface } from '../MapsWrapperInterface';

/// <reference types="leaflet" />
/// <reference types="leaflet.markercluster" />

import L, { MarkerClusterGroup } from 'leaflet';
import 'leaflet.markercluster';
import LeafletMapsWrapper from './LeafletMapWrapper';
import ClusteredMapsWrapperInterface from '../ClusteredMapsWrapperInterface';

export default class LeafletMapsClusteredWrapper extends LeafletMapsWrapper implements ClusteredMapsWrapperInterface {
  clusterer: MarkerClusterGroup | null = null;

  protected removeClusterer(): void {
    if (!this.clusterer) {
      return;
    }

    this.clusterer.clearLayers();
    if (this.map?.hasLayer(this.clusterer)) {
      this.map.removeLayer(this.clusterer);
    }
    this.clusterer = null;
  }

  addMapMarkers(markers: MapMarkerInterface[]): this {
    this.removeClusterer();
    super.addMapMarkers(markers);
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    // Add a marker clusterer to manage the markers.
    this.clusterer = L.markerClusterGroup(this.settings.clusterSettings || {});
    this.mapMarkers?.forEach(mapMarker => {
      mapMarker.removeFrom(this.map!);
      this.clusterer?.addLayer(mapMarker);
    });
    this.map?.addLayer(this.clusterer!);

    return this;
  }

  filterMarkers(callback: (marker: MapMarkerInterface) => boolean): this {
    this.mapMarkers?.forEach(mapMarker => {
      const originalSettings = mapMarker.originalSettings;
      if (!originalSettings) {
        return;
      }
      const isVisible = callback(originalSettings);
      if (isVisible) {
        this.clusterer?.addLayer(mapMarker);
      } else {
        this.clusterer?.removeLayer(mapMarker);
      }
      mapMarker.setOpacity(isVisible ? 1 : 0);
    });
    this.clusterer?.refreshClusters();
    return this;
  }
}
