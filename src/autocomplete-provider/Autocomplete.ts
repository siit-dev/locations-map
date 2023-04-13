import { LocationsMap, AutocompleteProvider, AutocompleteSetupSettings } from '..';
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
  protected settings = {};

  constructor(settings = {}) {
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
    this.input = input;
    if (!this.input) {
      throw new Error('Autocomplete input is not defined');
    }

    this.input.autocomplete = 'off';

    this.autocomplete = new autoComplete({
      data: {
        src: getResults,
        keys: ['title'],
        cache: false,
      },
      selector: () => this.input,
      ...this.settings,
    });

    this.input.addEventListener('selection', (event) => {
      onSelect(event.detail.selection.value.result);
    });

    return this;
  };
}
