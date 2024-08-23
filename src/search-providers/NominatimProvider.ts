import { AutocompleteResult, SearchProvider, SearchResult } from '../types/interfaces';

interface NominatimResult {
  lat: number;
  lon: number;
  display_name: string;
}

export default class NominatimProvider implements SearchProvider {
  results: SearchResult[] = [];

  _callAPI = async (url: string): Promise<SearchResult[]> => {
    return fetch(window.location.protocol + url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => (response.status === 200 ? response.json() : Promise.reject(response)))
      .then(data => {
        if (!data[0]) {
          this.results = [];
          return [];
        }

        this.results = data.map((item: NominatimResult) => {
          return {
            latitude: parseFloat(item.lat.toString()),
            longitude: parseFloat(item.lon.toString()),
            name: item.display_name.toString(),
            originalInfo: item,
          };
        });

        return this.results;
      })
      .catch(e => {
        this.results = [];
        throw e;
      });
  };

  search = async (searchFor: string): Promise<SearchResult[]> => {
    const url = `//nominatim.openstreetmap.org/search?format=json&city=${searchFor}`;
    return this._callAPI(url);
  };

  searchZip = (searchFor: string): Promise<SearchResult[]> => {
    const url = `//nominatim.openstreetmap.org/search?format=json&postalcode=${searchFor}`;
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
