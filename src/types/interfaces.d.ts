/// <reference types="google.maps" />
/// <reference path="../node_modules/@types/leaflet/index.d.ts" />

import { MarkerClustererOptions } from '@googlemaps/markerclustererplus';
import { AutocompleteProvider, GoogleIcon } from '.';
import MapsWrapperInterface from './map-providers/MapsWrapperInterface';
import { PaginationProvider } from '.';

export interface LocationData {
  id: string | number;
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
  selected?: boolean,
) => string | GoogleIcon | google.maps.Symbol | L.Icon | L.DivIcon;
export type Icon = IconCallback | string | GoogleIcon | google.maps.Symbol | L.Icon | L.DivIcon;

export interface LocationContainerSettings {
  latitude: number;
  longitude: number;
  locations: Array<LocationData>;
  zoom?: number;
  focusedZoom?: number;
  focusedAreaZoom?: number;
  displaySearch?: boolean;
  mapProvider?: MapsWrapperInterface | null;
  searchProvider?: SearchProvider | null;
  paginationProvider?: PaginationProvider | null;
  autocompleteProvider?: AutocompleteProvider | null;
  filters?: string[];
  icon?: Icon | null;
  clusterSettings?: MarkerClustererOptions;
  geolocateOnStart?: boolean;
  scrollToGeolocation?: boolean;
  focusOnClick?: boolean;
  focusOnHover?: boolean;
  focusOnHoverTimeout?: number;
  alwaysDisplayDistance?: boolean;
  templateDelimiters?: [string, string];
  preventDispatchingHtmlEvents?: boolean;
  customSorter?: (a: LocationData, b: LocationData) => number;
  customFilterer?: (location: LocationData, filters: string[]) => boolean;
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
