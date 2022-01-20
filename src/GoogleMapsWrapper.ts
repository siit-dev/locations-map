import { loadGoogleMapsAPI } from './google-maps-loader';
import MarkerClusterer from '@googlemaps/markerclustererplus';
import MapsWrapperInterface, {
  MapPositionInterface,
  MapMarkerInterface,
  MapSettingsInterface,
} from './MapsWrapperInterface';
import StoresMap from './StoresMap';
/// <reference types="google.maps" />

export default class GoogleMapsWrapper implements MapsWrapperInterface {
  map?: google.maps.Map;
  mapMarkers?: google.maps.Marker[];
  clusterer?: MarkerClusterer;
  settings: MapSettingsInterface;
  infoWindow?: google.maps.InfoWindow;

  constructor(public parent: StoresMap) {}

  addMarkerHoverCallback = fn => {
    return this;
  };

  addMarkerClickCallback = (callback: (marker: MapMarkerInterface) => void): this => {
    this.mapMarkers.forEach(marker =>
      marker.addListener('click', () => {
        callback(marker['originalSettings']);
      })
    );
    return this;
  };

  displayMarkerTooltip = (marker: MapMarkerInterface, content: string): this => {
    const mapMarker = this.mapMarkers.find(
      mapMarker => mapMarker['originalSettings'].store.id == marker.store.id
    );
    this.infoWindow = this.infoWindow || new google.maps.InfoWindow();
    this.infoWindow.setContent(content || marker.popup);
    this.infoWindow.open(this.map, mapMarker);
    this.infoWindow.addListener('closeclick', () =>
      this.parent.dispatchEvent('closedPopup')
    );
    return this;
  };

  closeMarkerTooltip = (): this => {
    if (this.infoWindow) {
      this.infoWindow.close();
    }
    return this;
  };

  initializeMap = async (
    elementId: string = 'map',
    settings: MapSettingsInterface = {
      latitude: 0,
      longitude: 0,
      clusters: true,
      icon: null,
    }
  ) => {
    this.settings = settings;
    await loadGoogleMapsAPI({ apiKey: settings.apiKey });
    this.map = new google.maps.Map(document.getElementById(elementId), {
      center: { lat: settings.latitude, lng: settings.longitude },
      zoom: settings.zoom,
      gestureHandling: 'greedy',
      streetViewControl: false,
      scrollwheel: false,
      navigationControl: true,
      mapTypeControl: false,
      scaleControl: true,
      disableDefaultUI: false,
      fullscreenControl: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      ...(settings.googleMapsSettings || {}),
    });
    return this.map;
  };

  addMapMarkers = (markers: MapMarkerInterface[]): this => {
    this.mapMarkers = markers.map(marker => {
      const mapMarker = new google.maps.Marker({
        position: {
          lat: parseFloat(marker.latitude.toString()),
          lng: parseFloat(marker.longitude.toString()),
        },
        icon: this.getMarkerIcon(marker),
        map: this.settings.clusters ? undefined : this.map,
      });
      mapMarker['originalSettings'] = marker;
      if (marker.popup) {
        const infoWindow = new google.maps.InfoWindow({
          content: marker.popup,
        });
        mapMarker.addListener('click', () => {
          infoWindow.open(this.map, mapMarker);
          if (this.settings.icon) {
            mapMarker.setIcon(this.getMarkerIcon(marker, true));
          }
        });
      }
      return mapMarker;
    });

    // Add a marker clusterer to manage the markers.
    if (this.settings.clusters) {
      this.clusterer = new MarkerClusterer(this.map, this.mapMarkers, {
        ignoreHidden: true,
        gridSize: 30,
        ...(this.settings.clusterSettings || {}),
      });
    }

    return this;
  };

  getMarkerIcon = (marker: MapMarkerInterface, selected: boolean = false) => {
    let icon = undefined;
    if (this.settings.icon) {
      if (this.settings.icon instanceof Function) {
        icon = this.settings.icon(marker.store, selected);
      } else {
        icon = this.settings.icon;
      }
    }
    return icon;
  };

  /**
   * highlight a selected marker
   */
  highlightMapMarker = (marker: MapMarkerInterface): this => {
    this.mapMarkers.forEach(mapMarker => {
      if (mapMarker['originalSettings'].store.id == marker.store.id) {
        if (this.settings.icon) {
          mapMarker.setIcon(this.getMarkerIcon(marker, true));
        }
      }
    });
    return this;
  };

  /**
   * remove hightlight from all markers
   */
  unhighlightMarkers = (): this => {
    if (this.settings.icon) {
      this.mapMarkers.forEach(mapMarker => {
        mapMarker.setIcon(this.getMarkerIcon(mapMarker['originalSettings']));
      });
    }
    return this;
  };

  filterMarkers = (callback: (marker: MapMarkerInterface) => boolean): this => {
    this.mapMarkers.forEach(mapMarker => {
      mapMarker.setVisible(callback(mapMarker['originalSettings']));
    });
    this.clusterer?.repaint();
    return this;
  };

  getMap = () => {
    return this.map;
  };

  getMapMarkers = (): google.maps.Marker[] => {
    return this.mapMarkers;
  };

  panTo = (position: MapPositionInterface): this => {
    this.map.panTo({
      lat: position.latitude,
      lng: position.longitude,
    });
    return this;
  };

  setZoom = (zoom: number): this => {
    this.map.setZoom(zoom);
    return this;
  };
}
