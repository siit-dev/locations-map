import MarkerClusterer, { MarkerClustererOptions } from '@googlemaps/markerclustererplus';
import {
  GoogleMapsWrapper,
  MapMarkerInterface,
  ClusteredMapsWrapperInterface,
  GoogleMapSettingsInterface,
} from '..';
/// <reference types="google.maps" />

export interface GoogleMapClusteredSettingsInterface extends GoogleMapSettingsInterface {
  clusterSettings?: MarkerClustererOptions;
}

export default class GoogleMapsClusteredWrapper
  extends GoogleMapsWrapper
  implements ClusteredMapsWrapperInterface
{
  clusterer: MarkerClusterer;

  constructor(settings?: GoogleMapClusteredSettingsInterface) {
    super(settings);
    this.settings = settings;
  }

  addMapMarkers(markers: MapMarkerInterface[]): this {
    this.mapMarkers = markers.map(marker => this.createMapMarker(marker, true));

    // Add a marker clusterer to manage the markers.
    this.clusterer = new MarkerClusterer(this.map, this.mapMarkers, {
      ignoreHidden: true,
      gridSize: 30,
      ...(this.settings.clusterSettings || {}),
    });

    return this;
  }

  filterMarkers(callback: (marker: MapMarkerInterface) => boolean): this {
    super.filterMarkers(callback);
    this.clusterer.repaint();
    return this;
  }
}
