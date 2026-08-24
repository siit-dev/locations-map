import { AutocompleteResult, LocationsMap, AutocompleteProvider, AutocompleteSetupSettings } from '..';
import autoComplete, { AutoCompleteConfig } from '@tarekraafat/autocomplete.js';

declare global {
  interface ElementEventMap {
    selection: CustomEvent<{
      event: Event;
      query: string;
      matches: any[];
      selection: {
        index: number;
        key: string;
        match: string;
        value: Record<string, any>;
      };
    }>;
  }
}

export const defaultSettings: Partial<AutoCompleteConfig> = {
  threshold: 3,
  debounce: 300,
  diacritics: true,
  searchEngine: () => true,
  resultsList: {
    maxResults: 10,
  },
  resultItem: {
    element: (source: HTMLElement, data: any) => {
      source.innerHTML = `${data.value.title}`;
    },
  },
};

export default class Autocomplete implements AutocompleteProvider {
  parent: LocationsMap | null = null;
  input: HTMLInputElement | null = null;
  autocomplete?: any = null;
  protected settings: Partial<AutoCompleteConfig>;
  protected resultLoader?: AutocompleteSetupSettings['getResults'];

  constructor(settings: Partial<AutoCompleteConfig> = {}) {
    this.settings = {
      ...defaultSettings,
      ...settings,
    };
  }

  setParent = (parent: LocationsMap): this => {
    this.parent = parent;
    return this;
  };

  setup = ({ getResults, input, onSelect }: AutocompleteSetupSettings): this => {
    this.resultLoader = getResults;
    this.input = input;
    if (!this.input) {
      throw new Error('Autocomplete input is not defined');
    }

    this.input.autocomplete = 'off';

    this.autocomplete = new autoComplete({
      data: {
        src: async (query?: string) => {
          try {
            return (await this.resultLoader?.(query)) || [];
          } catch (_error) {
            return [];
          }
        },
        keys: ['title'],
        cache: false,
      },
      selector: () => this.input,
      ...this.settings,
    });

    this.input.addEventListener('selection', event => {
      onSelect(event.detail.selection.value.result);
    });

    return this;
  };

  getResults = async (query?: string): Promise<AutocompleteResult[]> => {
    const normalizedQuery = this.settings.query && query !== undefined ? this.settings.query(query) : query;
    return (await this.resultLoader?.(normalizedQuery)) || [];
  };

  start = (query?: string): void => {
    this.autocomplete?.start?.(query);
  };
}
