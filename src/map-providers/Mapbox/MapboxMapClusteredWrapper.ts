import type { MapMarkerInterface } from '../MapsWrapperInterface';
import type ClusteredMapsWrapperInterface from '../ClusteredMapsWrapperInterface';
import MapboxMapWrapper, {
  MapboxGeoJSONFeature,
  MapboxGeoJSONSource,
  MapboxMarkerInstance,
  MapboxSettingsInterface,
} from './MapboxMapWrapper';

/** GeoJSON source options supported by the clustered Mapbox wrapper. */
export interface MapboxClusterSettingsInterface {
  /** The wrapper always sends this as true; false is ignored in clustered mode. */
  cluster?: boolean;
  clusterRadius?: number;
  clusterMaxZoom?: number;
  clusterMinPoints?: number;
  clusterProperties?: Record<string, any>;
  maxzoom?: number;
  minzoom?: number;
  attribution?: string;
  buffer?: number;
  filter?: any[];
  tolerance?: number;
  lineMetrics?: boolean;
  generateId?: boolean;
  promoteId?: string | Record<string, string>;
  dynamic?: boolean;
  clusterMarkerClassName?: string;
}

export interface MapboxClusteredSettingsInterface extends MapboxSettingsInterface {
  clusterSettings?: MapboxClusterSettingsInterface;
}

type LocationFeature = {
  type: 'Feature';
  properties: {
    locationId: string | number;
    markerIndex: number;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
};

export default class MapboxMapClusteredWrapper extends MapboxMapWrapper implements ClusteredMapsWrapperInterface {
  clusterer: MapboxGeoJSONSource | null = null;
  settings: MapboxClusteredSettingsInterface;
  protected sourceId = 'locations-mapbox-locations';
  protected clusterLayerId = 'locations-mapbox-clusters';
  protected pointLayerId = 'locations-mapbox-points';
  protected visibleClusterMarkers: Record<string, MapboxMarkerInstance> = {};
  protected visiblePointMarkers: Record<string, MapboxMarkerInstance> = {};
  protected visibleMarkerFilter: (marker: MapMarkerInterface) => boolean = () => true;
  protected clusterSetupPending = false;
  protected clusterListenersRegistered = false;

  constructor(settings: MapboxClusteredSettingsInterface) {
    super(settings);
    this.settings = settings;
  }

  addMapMarkers(markers: MapMarkerInterface[]): this {
    // Visible point markers are also the managed markers owned by the base
    // wrapper. Let its cleanup remove those exactly once.
    this.clearVisibleMarkers(false);
    this.removeMapMarkers();
    this.mapMarkers = markers.map(marker => this.createMapMarker(marker, true));
    this.mapMarkers.forEach(mapMarker => {
      this.markerClickCallbacks.forEach(callback => this.attachMarkerClickCallback(mapMarker, callback));
    });
    this.setupClusterSourceWhenReady();
    return this;
  }

  filterMarkers(callback: (marker: MapMarkerInterface) => boolean): this {
    this.visibleMarkerFilter = callback;
    this.updateClusterSource();
    return this;
  }

  protected clearAdditionalMarkers(): void {
    Object.values(this.visibleClusterMarkers).forEach(marker => marker.remove());
    this.visibleClusterMarkers = {};
    this.visiblePointMarkers = {};
    this.clusterer = null;
    this.clusterSetupPending = false;
    this.clusterListenersRegistered = false;
  }

  protected clearVisibleMarkers(removePointMarkers: boolean = true): void {
    Object.values(this.visibleClusterMarkers).forEach(marker => marker.remove());
    if (removePointMarkers) {
      Object.values(this.visiblePointMarkers).forEach(marker => marker.remove());
    }
    this.visibleClusterMarkers = {};
    this.visiblePointMarkers = {};
  }

  protected setupClusterSourceWhenReady(): void {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    if (this.clusterSetupPending) {
      return;
    }

    if (this.map.getSource(this.sourceId)) {
      this.setupClusterSource();
      return;
    }

    if (this.map.isStyleLoaded?.()) {
      this.setupClusterSource();
      return;
    }

    this.clusterSetupPending = true;
    this.addMapOnceListener('load', () => {
      this.clusterSetupPending = false;
      this.setupClusterSource();
    });
  }

  protected setupClusterSource(): void {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    const existingSource = this.map.getSource(this.sourceId) as MapboxGeoJSONSource | undefined;
    const sourceUpdated = !!existingSource;
    if (!existingSource) {
      const clusterSettings = this.settings.clusterSettings || {};
      this.map.addSource(this.sourceId, {
        type: 'geojson',
        data: this.getFeatureCollection(),
        clusterRadius: 50,
        clusterMaxZoom: 14,
        ...this.getSupportedClusterSettings(clusterSettings),
        // A clustered wrapper must remain clustered even when copied source
        // settings contain `cluster: false`.
        cluster: true,
      });
    } else {
      existingSource.setData(this.getFeatureCollection());
    }

    this.clusterer = (this.map.getSource(this.sourceId) || existingSource) as MapboxGeoJSONSource;
    this.addHelperLayers();
    if (!this.clusterListenersRegistered) {
      this.addMapListener('moveend', this.renderVisibleMarkers);
      this.addMapListener('sourcedata', this.renderVisibleMarkers);
      this.clusterListenersRegistered = true;
    }
    if (!sourceUpdated) {
      this.renderVisibleMarkers();
    }
  }

  protected addHelperLayers(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getLayer(this.clusterLayerId)) {
      this.map.addLayer({
        id: this.clusterLayerId,
        type: 'circle',
        source: this.sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-opacity': 0,
          'circle-radius': 1,
        },
      });
    }

    if (!this.map.getLayer(this.pointLayerId)) {
      this.map.addLayer({
        id: this.pointLayerId,
        type: 'circle',
        source: this.sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-opacity': 0,
          'circle-radius': 1,
        },
      });
    }
  }

  protected getSupportedClusterSettings(clusterSettings: MapboxClusterSettingsInterface): Record<string, any> {
    const { clusterRadius, clusterMaxZoom, clusterMinPoints, clusterProperties } = clusterSettings;
    const sourceSettings: Record<string, any> = {};
    const supportedSourceKeys = [
      'maxzoom',
      'minzoom',
      'attribution',
      'buffer',
      'filter',
      'tolerance',
      'lineMetrics',
      'generateId',
      'promoteId',
      'dynamic',
    ];

    supportedSourceKeys.forEach(key => {
      const value = clusterSettings[key as keyof MapboxClusterSettingsInterface];
      if (value !== undefined) {
        sourceSettings[key] = value;
      }
    });

    return {
      ...sourceSettings,
      ...(clusterRadius !== undefined ? { clusterRadius } : {}),
      ...(clusterMaxZoom !== undefined ? { clusterMaxZoom } : {}),
      ...(clusterMinPoints !== undefined ? { clusterMinPoints } : {}),
      ...(clusterProperties !== undefined ? { clusterProperties } : {}),
    };
  }

  protected updateClusterSource(): void {
    if (!this.clusterer) {
      return;
    }

    this.closeMarkerTooltip();
    this.clearVisibleMarkers();
    this.clusterer.setData(this.getFeatureCollection());
  }

  protected getFeatureCollection(): {
    type: 'FeatureCollection';
    features: LocationFeature[];
  } {
    const features = (this.mapMarkers || [])
      .map((mapMarker, markerIndex): LocationFeature | null => {
        const originalSettings = mapMarker.originalSettings;
        if (!originalSettings || !this.visibleMarkerFilter(originalSettings) || !originalSettings.location) {
          return null;
        }

        return {
          type: 'Feature',
          properties: {
            locationId: originalSettings.location.id,
            markerIndex,
          },
          geometry: {
            type: 'Point',
            coordinates: [
              parseFloat(originalSettings.longitude.toString()),
              parseFloat(originalSettings.latitude.toString()),
            ],
          },
        };
      })
      .filter((feature): feature is LocationFeature => !!feature);

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  protected renderVisibleMarkers = (): void => {
    if (!this.map || !this.mapboxgl || !this.clusterer) {
      return;
    }

    const visibleClusterMarkers: Record<string, MapboxMarkerInstance> = {};
    const visiblePointMarkers: Record<string, MapboxMarkerInstance> = {};
    const seenClusterKeys = new Set<string>();
    const seenPointKeys = new Set<string>();
    const features = this.map.querySourceFeatures(this.sourceId) || [];

    features.forEach(feature => {
      if (!feature.geometry || feature.geometry.type !== 'Point') {
        return;
      }

      if (feature.properties?.cluster) {
        const key = this.getClusterKey(feature);
        if (seenClusterKeys.has(key)) {
          return;
        }
        seenClusterKeys.add(key);
        const marker = this.getVisibleClusterMarker(feature);
        if (marker) {
          visibleClusterMarkers[key] = marker;
        }
        return;
      }

      const key = this.getPointKey(feature);
      if (seenPointKeys.has(key)) {
        return;
      }
      seenPointKeys.add(key);
      const marker = this.getVisiblePointMarker(feature);
      if (marker) {
        visiblePointMarkers[key] = marker;
      }
    });

    Object.keys(this.visibleClusterMarkers).forEach(key => {
      if (!visibleClusterMarkers[key]) {
        this.visibleClusterMarkers[key].remove();
      }
    });
    Object.keys(this.visiblePointMarkers).forEach(key => {
      if (!visiblePointMarkers[key]) {
        this.visiblePointMarkers[key].remove();
      }
    });

    this.visibleClusterMarkers = visibleClusterMarkers;
    this.visiblePointMarkers = visiblePointMarkers;
  };

  protected getVisibleClusterMarker(feature: MapboxGeoJSONFeature): MapboxMarkerInstance | null {
    if (!this.map || !this.mapboxgl || !feature.properties || !feature.geometry?.coordinates) {
      return null;
    }

    const key = this.getClusterKey(feature);
    const existingMarker = this.visibleClusterMarkers[key];
    if (existingMarker) {
      existingMarker.setLngLat(feature.geometry.coordinates as [number, number]);
      return existingMarker;
    }

    const element = this.createClusterElement(
      feature.properties.point_count_abbreviated || feature.properties.point_count,
    );
    const marker = new this.mapboxgl.Marker({
      element,
    })
      .setLngLat(feature.geometry.coordinates as [number, number])
      .addTo(this.map);

    element.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      this.zoomToCluster(feature);
    });

    return marker;
  }

  protected getVisiblePointMarker(feature: MapboxGeoJSONFeature): MapboxMarkerInstance | null {
    if (!this.map || !feature.properties) {
      return null;
    }

    const marker = this.mapMarkers?.[Number(feature.properties.markerIndex)];
    if (!marker) {
      return null;
    }

    const originalSettings = marker.originalSettings;
    if (!originalSettings || !this.visibleMarkerFilter(originalSettings)) {
      return null;
    }

    const key = this.getPointKey(feature);
    const existingMarker = this.visiblePointMarkers[key];
    if (existingMarker) {
      return existingMarker;
    }

    marker.addTo(this.map);
    this.restoreMarkerDisplay(marker);
    return marker;
  }

  protected createClusterElement(pointCount: string | number): HTMLElement {
    const customClassName = this.settings.clusterSettings?.clusterMarkerClassName;
    const element = document.createElement('button');
    element.type = 'button';
    element.className = customClassName || 'locations-mapbox-cluster';
    element.textContent = pointCount.toString();

    if (!customClassName) {
      element.style.alignItems = 'center';
      element.style.background = '#1976d2';
      element.style.border = '2px solid #ffffff';
      element.style.borderRadius = '50%';
      element.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.35)';
      element.style.color = '#ffffff';
      element.style.cursor = 'pointer';
      element.style.display = 'flex';
      element.style.font = '600 12px/1 sans-serif';
      element.style.height = '36px';
      element.style.justifyContent = 'center';
      element.style.padding = '0';
      element.style.width = '36px';
    }
    return element;
  }

  protected zoomToCluster(feature: MapboxGeoJSONFeature): void {
    if (!this.map || !this.clusterer || !feature.properties || !feature.geometry?.coordinates) {
      return;
    }

    const coordinates = feature.geometry.coordinates as [number, number];
    this.clusterer.getClusterExpansionZoom(Number(feature.properties.cluster_id), (error, zoom) => {
      if (error || typeof zoom !== 'number') {
        return;
      }

      this.map?.easeTo({
        center: coordinates,
        zoom,
      });
    });
  }

  protected getClusterKey(feature: MapboxGeoJSONFeature): string {
    return `cluster-${feature.properties?.cluster_id}`;
  }

  protected getPointKey(feature: MapboxGeoJSONFeature): string {
    const markerIndex = feature.properties?.markerIndex;
    return markerIndex === undefined
      ? `point-${feature.properties?.locationId}`
      : `point-${feature.properties?.locationId}-${markerIndex}`;
  }
}
