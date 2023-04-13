import { MarkerClustererOptions } from '@googlemaps/markerclustererplus';
import MapsWrapperInterface, { MapSettingsInterface } from './MapsWrapperInterface';

export interface ClusteredMapSettingsInterface extends MapSettingsInterface {
  clusterSettings?: MarkerClustererOptions;
}

export default interface ClusteredMapsWrapperInterface extends MapsWrapperInterface {
  clusterer: any;

  initializeMap: (elementId?: string, settings?: ClusteredMapSettingsInterface) => Promise<any>;
}
