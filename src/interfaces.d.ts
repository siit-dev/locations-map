/// <reference types="google.maps" />
/// <reference path="../node_modules/@types/leaflet/index.d.ts" />

import { MarkerClustererOptions } from '@googlemaps/markerclustererplus';
import List from 'list.js';

export interface StoreData {
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

export interface IndexedStoreData {
  [key: string]: StoreData;
}

export type IconCallback = (
  store: StoreData,
  selected?: boolean
) => string | google.maps.Icon | google.maps.Symbol | L.Icon | L.DivIcon;
export type Icon =
  | IconCallback
  | string
  | google.maps.Icon
  | google.maps.Symbol
  | L.Icon
  | L.DivIcon;

export interface StoreContainerSettings {
  latitude: number;
  longitude: number;
  zoom: number;
  stores: Array<StoreData>;
  city: string;
  zip: string;
  displaySearch: boolean;
  filters?: string[];
  storesPopup: { [key: number]: string };
  useGoogleMaps?: boolean;
  useGoogleMapsGeocoder?: boolean;
  apiKey?: string | undefined;
  googleMapsSettings?: google.maps.MapOptions;
  paginationSettings?: List.ListOptions;
  autocomplete?: boolean;
  focusedZoom?: number;
  focusedAreaZoom?: number;
  icon?: Icon;
  clusters?: boolean;
  clusterSettings?: MarkerClustererOptions;
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
