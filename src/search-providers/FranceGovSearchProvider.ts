import { AutocompleteResult, SearchProvider, SearchResult } from '../types/interfaces';

export interface FranceGovSearchResult {
  type: string;
  geometry: {
    type: 'Point' | string;
    coordinates: [longitude: number, latitude: number];
  };
  properties: {
    label: string;
    score: number;
    type: string;
    city: string;
    context: string;
    postcode: string;
    name: string;
    housenumber?: string;
    street?: string;
    municipality?: string;
  };
}

export interface FranceGovSearchProviderOptions {
  type?: string;
}

export default class FranceGovSearchProvider implements SearchProvider {
  results: SearchResult[] = [];
  type: string | null = null;

  constructor(options: FranceGovSearchProviderOptions = {}) {
    this.type = options.type || this.type;
  }

  _callAPI = async (url: string): Promise<SearchResult[]> => {
    return fetch(window.location.protocol + url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => (response.status === 200 ? response.json() : Promise.reject(response)))
      .then(data => {
        if (!data.features) {
          this.results = [];
          return [];
        }

        this.results = data.features
          .map((item: FranceGovSearchResult) => {
            if (!item.geometry.coordinates) {
              return null;
            }
            return {
              latitude: parseFloat(item.geometry.coordinates[1].toString()),
              longitude: parseFloat(item.geometry.coordinates[0].toString()),
              name: item.properties.label.toString(),
              originalInfo: item,
            };
          })
          .filter(Boolean) as SearchResult[];

        return this.results;
      })
      .catch(e => {
        this.results = [];
        throw e;
      });
  };

  search = async (searchFor: string): Promise<SearchResult[]> => {
    const url = `//api-adresse.data.gouv.fr/search/?q=${searchFor}&limit=10` + (this.type ? `&type=${this.type}` : '');
    return this._callAPI(url);
  };

  searchZip = (searchFor: string): Promise<SearchResult[]> => {
    const url = `//franceGovSearch.openstreetmap.org/search?format=json&postalcode=${searchFor}&type=postcode&limit=10`;
    return this._callAPI(url);
  };

  getAutocompleteData = (): AutocompleteResult[] => {
    return this.results.map(result => {
      return {
        title: result.name,
        result,
      };
    });
  };
}
