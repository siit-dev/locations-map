/// <reference types="google.maps" />
/// <reference path="../node_modules/@types/leaflet/index.d.ts" />

import { MarkerClustererOptions } from '@googlemaps/markerclustererplus';
import { AutocompleteProvider } from '.';
import MapsWrapperInterface from './map-providers/MapsWrapperInterface';
import { PaginationProvider } from '.';

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
  paginationProvider?: PaginationProvider;
  autocompleteProvider?: AutocompleteProvider;
  filters?: string[];
  icon?: Icon;
  clusterSettings?: MarkerClustererOptions;
  geolocateOnStart?: boolean;
  scrollToGeolocation?: boolean;
  focusOnClick?: boolean;
  focusOnHover?: boolean;
  focusOnHoverTimeout?: number;
  alwaysDisplayDistance?: boolean;
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
