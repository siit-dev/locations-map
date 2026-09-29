import MarkerClusterer, { MarkerClustererOptions } from '@googlemaps/markerclustererplus';
import {
  GoogleMapsWrapper,
  MapMarkerInterface,
  ClusteredMapsWrapperInterface,
  GoogleMapSettingsInterface,
} from '../..';

export interface GoogleMapClusteredSettingsInterface extends GoogleMapSettingsInterface {
  clusterSettings?: MarkerClustererOptions;
}

export default class GoogleMapsClusteredWrapper extends GoogleMapsWrapper implements ClusteredMapsWrapperInterface {
  clusterer: MarkerClusterer | null = null;

  constructor(settings: GoogleMapClusteredSettingsInterface = {}) {
    super(settings);
    if (settings) {
      this.settings = settings;
    }
  }

  protected removeClusterer(): void {
    if (!this.clusterer) {
      return;
    }

    this.clusterer.clearMarkers();
    this.clusterer.setMap(null);
    this.clusterer = null;
  }

  addMapMarkers(markers: MapMarkerInterface[]): this {
    this.removeClusterer();
    this.removeMapMarkers();
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    this.mapMarkers = markers.map(marker => this.createMapMarker(marker, true));
    this.mapMarkers.forEach(mapMarker => {
      this.markerClickCallbacks.forEach(callback => this.attachMarkerClickCallback(mapMarker, callback));
    });

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
    this.clusterer?.repaint();
    return this;
  }
}
