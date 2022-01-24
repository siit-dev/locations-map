/// <reference types="google.maps" />
/// <reference path="../node_modules/@types/leaflet/index.d.ts" />

import { MarkerClustererOptions } from '@googlemaps/markerclustererplus';
import { ListOptions } from 'list.js';
import MapsWrapperInterface from './map-providers/MapsWrapperInterface';

export interface LocationData {
  id: string;
  latitude: number;
  longitude: number;
  type?: string;
  name?: string;
  filterTypes?: string | string[];
  hours?: object | string;
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

export type CustomAutocompleteCallback = (settings: {
  getResults: () => Promise<AutocompleteResult[]>;
  input: HTMLInputElement | null;
  onSelect: (selected: SearchResult) => any | void;
}) => any;

export interface LocationContainerSettings {
  latitude: number;
  longitude: number;
  locations: Array<LocationData>;
  zoom?: number;
  focusedZoom?: number;
  focusedAreaZoom?: number;
  displaySearch?: boolean;
  mapProvider: MapsWrapperInterface;
  searchProvider?: SearchProvider;
  filters?: string[];
  paginationSettings?: ListOptions | false;
  autocomplete?: boolean | CustomAutocompleteCallback;
  autocompleteExtraSettings?: Record<string, unknown>;
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
