import MarkerClusterer, { MarkerClustererOptions } from '@googlemaps/markerclustererplus';
import { GoogleMapsWrapper, MapMarkerInterface, ClusteredMapsWrapperInterface, GoogleMapSettingsInterface } from '..';

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

  addMapMarkers(markers: MapMarkerInterface[]): this {
    this.mapMarkers = markers.map(marker => this.createMapMarker(marker, true));
    if (!this.map) {
      throw new Error('Map not initialized');
    }

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
