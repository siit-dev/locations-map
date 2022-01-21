import { MapMarkerInterface } from './MapsWrapperInterface';

/// <reference path="./node_modules/@types/leaflet/index.d.ts" />

import L from 'leaflet';
import 'leaflet.markercluster';
import { LeafletMapsWrapper } from '..';
import ClusteredMapsWrapperInterface from './ClusteredMapsWrapperInterface';

export default class LeafletMapsClusteredWrapper
  extends LeafletMapsWrapper
  implements ClusteredMapsWrapperInterface
{
  clusterer: any;

  addMapMarkers(markers: MapMarkerInterface[]): this {
    super.addMapMarkers(markers);

    // Add a marker clusterer to manage the markers.
    this.clusterer = (L as any).markerClusterGroup({
      ...(this.settings.clusterSettings || {}),
    });
    this.mapMarkers.forEach(mapMarker => {
      mapMarker.removeFrom(this.map);
      this.clusterer.addLayer(mapMarker);
    });
    this.map.addLayer(this.clusterer);

    return this;
  }

  filterMarkers(callback: (marker: MapMarkerInterface) => boolean): this {
    this.mapMarkers.forEach(mapMarker => {
      const isVisible = callback(mapMarker['originalSettings']);
      if (isVisible) {
        this.clusterer.addLayer(mapMarker);
      } else {
        this.clusterer.removeLayer(mapMarker);
      }
      mapMarker.setOpacity(isVisible ? 1 : 0);
    });
    this.clusterer.refreshClusters();
    return this;
  }
}
