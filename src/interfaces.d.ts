/// <reference types="google.maps" />
/// <reference path="../node_modules/@types/leaflet/index.d.ts" />

import { MarkerClustererOptions } from '@googlemaps/markerclustererplus';
import { ListOptions } from 'list.js';
import MapsWrapperInterface from './map-providers/MapsWrapperInterface';

export interface LocationData {
  latitude: number;
  longitude: number;
  lat: number;
  lon: number;
  hours?: object | string;
  id: string;
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  phone?: string;
  link?: string;
  type?: string;
  [key: string]: any;
}

export interface IndexedLocationData {
  [key: string]: LocationData;
}

export type IconCallback = (
  location: LocationData,
  selected?: boolean
) => string | google.maps.Icon | google.maps.Symbol | L.Icon | L.DivIcon;
export type Icon =
  | IconCallback
  | string
  | google.maps.Icon
  | google.maps.Symbol
  | L.Icon
  | L.DivIcon;

export interface LocationContainerSettings {
  latitude: number;
  longitude: number;
  zoom: number;
  locations: Array<LocationData>;
  city: string;
  zip: string;
  displaySearch: boolean;
  mapProvider: MapsWrapperInterface;
  searchProvider?: SearchProvider;
  filters?: string[];
  locationsPopup: { [key: number]: string };
  paginationSettings?: ListOptions;
  autocomplete?: boolean;
  focusedZoom?: number;
  focusedAreaZoom?: number;
  icon?: Icon;
  clusterSettings?: MarkerClustererOptions;
  geolocateOnStart?: boolean;
  scrollToGeolocation?: boolean;
  focusOnClick?: boolean;
  focusOnHover?: boolean;
  focusOnHoverTimeout?: number;
  [key: string]: any;
}

export interface SearchProvider {
  search: (searchFor: string) => Promise<SearchResult[]>;
  searchZip: (searchFor: string) => Promise<SearchResult[]>;
  getAutocompleteData: () => AutocompleteResult[];
}

export interface SearchResult {
  latitude: number;
  longitude: number;
  name: string;
  originalInfo?: object;
}

export interface AutocompleteResult {
  title: string;
  result: SearchResult;
  [key: string]: any;
}

export interface Position {
  coords: { latitude: number; longitude: number };
}
