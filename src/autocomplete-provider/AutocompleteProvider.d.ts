import { AutocompleteResult, LocationsMap, SearchResult } from '..';

export interface AutocompleteSetupSettings {
  getResults: () => Promise<AutocompleteResult[]>;
  input: HTMLInputElement | null;
  onSelect: (selected: SearchResult) => any | void;
}

export interface AutocompleteProvider {
  parent: LocationsMap;

  input: HTMLInputElement | null;

  setParent: (parent: LocationsMap) => this;
  setup: (settings: AutocompleteSetupSettings) => any;
}
