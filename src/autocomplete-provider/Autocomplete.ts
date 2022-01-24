import { LocationsMap, AutocompleteProvider, AutocompleteSetupSettings } from '..';
import autoComplete from '@tarekraafat/autocomplete.js';

export const defaultSettings = {
  trigger: {
    event: ['input', 'submit'],
  },
  threshold: 3,
  debounce: 300,
  diacritics: true,
  searchEngine: () => true,
  highlight: false,
  maxResults: 10,
  resultsList: {
    render: true,
  },
  resultItem: {
    content: (data, source) => {
      source.innerHTML = `${data.value.title}`;
    },
    element: 'li',
  },
};

export default class Autocomplete implements AutocompleteProvider {
  parent: LocationsMap;
  input: HTMLInputElement = null;
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
    this.input.autocomplete = 'off';

    this.autocomplete = new autoComplete({
      data: {
        src: getResults,
        key: ['title'],
        cache: false,
      },
      selector: () => this.input,
      onSelection: ({ selection: { value: selected } }) => onSelect(selected.result),
      ...this.settings,
    });

    return this;
  };
}
