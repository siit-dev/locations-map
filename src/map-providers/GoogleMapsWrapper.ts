import { loadGoogleMapsAPI } from './google-maps-loader';
import MapsWrapperInterface, {
  MapPositionInterface,
  MapMarkerInterface,
  MapSettingsInterface,
} from './MapsWrapperInterface';
import LocationsMap from '../LocationsMap';
import { LoaderOptions } from '@googlemaps/js-api-loader';
import { InfoWindow, MapOptions, Marker, GoogleMap } from '..';

export interface GoogleMapSettingsInterface extends MapSettingsInterface {
  apiSettings?: LoaderOptions;
  mapSettings?: MapOptions;
}

export default class GoogleMapsWrapper implements MapsWrapperInterface {
  map?: GoogleMap;
  mapMarkers?: Marker[] = [];
  settings: GoogleMapSettingsInterface;
  infoWindow?: InfoWindow;
  parent?: LocationsMap = null;

  constructor(settings?: GoogleMapSettingsInterface) {
    this.settings = settings;
  }

  setParent(parent: LocationsMap): this {
    this.parent = parent;
    return this;
  }

  addMarkerHoverCallback(fn) {
    return this;
  }

  addMarkerClickCallback(callback: (marker: MapMarkerInterface) => void): this {
    this.mapMarkers.forEach(marker =>
      marker.addListener('click', () => {
        callback(marker['originalSettings']);
      })
    );
    return this;
  }

  displayMarkerTooltip(marker: MapMarkerInterface, content: string): this {
    const mapMarker = this.mapMarkers.find(
      mapMarker => mapMarker['originalSettings'].location.id == marker.location.id
    );
    this.infoWindow = this.infoWindow || new google.maps.InfoWindow();
    this.infoWindow.setContent(content || marker.popup);
    this.infoWindow.open(this.map, mapMarker);
    this.infoWindow.addListener('closeclick', () =>
      this.parent.dispatchEvent('closedPopup')
    );
    return this;
  }

  closeMarkerTooltip(): this {
    if (this.infoWindow) {
      this.infoWindow.close();
    }
    return this;
  }

  async initializeMap(
    elementId: string = 'map',
    settings: GoogleMapSettingsInterface = {
      latitude: 0,
      longitude: 0,
      icon: null,
    }
  ) {
    if (!this.parent) {
      throw new Error('Missing parent LocationsMap');
    }
    this.settings = { ...settings, ...this.settings };

    await loadGoogleMapsAPI(this.settings.apiSettings);
    this.map = new google.maps.Map(document.getElementById(elementId), {
      center: { lat: this.settings.latitude, lng: this.settings.longitude },
      zoom: this.settings.zoom,
      gestureHandling: 'greedy',
      streetViewControl: false,
      scrollwheel: false,
      mapTypeControl: false,
      scaleControl: true,
      disableDefaultUI: false,
      fullscreenControl: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      ...(this.settings.mapSettings || {}),
    });

    return this.map;
  }

  createMapMarker(marker: MapMarkerInterface, hasClusters: boolean = false): Marker {
    const mapMarker = new google.maps.Marker({
      position: {
        lat: parseFloat(marker.latitude.toString()),
        lng: parseFloat(marker.longitude.toString()),
      },
      icon: this.getMarkerIcon(marker),
      map: hasClusters ? undefined : this.map,
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
  }

  addMapMarkers(markers: MapMarkerInterface[]): this {
    this.mapMarkers = markers.map(marker => this.createMapMarker(marker, false));
    return this;
  }

  getMarkerIcon(marker: MapMarkerInterface, selected: boolean = false) {
    let icon = undefined;
    if (this.settings.icon) {
      if (this.settings.icon instanceof Function) {
        icon = this.settings.icon(marker.location, selected);
      } else {
        icon = this.settings.icon;
      }
    }
    return icon;
  }

  /**
   * highlight a selected marker
   */
  highlightMapMarker(marker: MapMarkerInterface): this {
    this.mapMarkers.forEach(mapMarker => {
      if (mapMarker['originalSettings'].location.id == marker.location.id) {
        if (this.settings.icon) {
          mapMarker.setIcon(this.getMarkerIcon(marker, true));
        }
      }
    });
    return this;
  }

  /**
   * remove hightlight from all markers
   */
  unhighlightMarkers(): this {
    if (this.settings.icon) {
      this.mapMarkers.forEach(mapMarker => {
        mapMarker.setIcon(this.getMarkerIcon(mapMarker['originalSettings']));
      });
    }
    return this;
  }

  filterMarkers(callback: (marker: MapMarkerInterface) => boolean): this {
    this.mapMarkers.forEach(mapMarker => {
      mapMarker.setVisible(callback(mapMarker['originalSettings']));
    });
    return this;
  }

  getMap() {
    return this.map;
  }

  getMapMarkers(): Marker[] {
    return this.mapMarkers;
  }

  panTo(position: MapPositionInterface): this {
    this.map.panTo({
      lat: position.latitude,
      lng: position.longitude,
    });
    return this;
  }

  setZoom(zoom: number): this {
    this.map.setZoom(zoom);
    return this;
  }
}
