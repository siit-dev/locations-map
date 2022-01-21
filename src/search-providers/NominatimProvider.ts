import $ from 'jquery';
import { AutocompleteResult, SearchProvider, SearchResult } from '../interfaces';

export default class NominatimProvider implements SearchProvider {
  results: SearchResult[] = [];

  _callAPI = (url: string): Promise<SearchResult[]> => {
    return new Promise((resolve, reject) => {
      $.get(window.location.protocol + url, data => {
        if (!data[0]) {
          this.results = [];
          resolve([]);
        }

        this.results = data.map(item => {
          return {
            latitude: parseFloat(item.lat.toString()),
            longitude: parseFloat(item.lon.toString()),
            name: item.display_name.toString(),
            originalInfo: item,
          };
        });
        resolve(this.results);
      }).catch(e => {
        this.results = [];
        reject(e);
      });
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
