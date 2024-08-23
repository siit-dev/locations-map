import { AutocompleteResult, SearchProvider, SearchResult } from '../types/interfaces';
/// <reference types="google.maps" />

interface GoogleMapsGeocoderProviderOptions {
  region?: string | null;
}

export default class GoogleMapsGeocoderProvider implements SearchProvider {
  results: SearchResult[] = [];
  region: string | null = 'FR';

  constructor(options: GoogleMapsGeocoderProviderOptions = {}) {
    this.region = options.region || this.region;
  }

  _search = (term: string): Promise<SearchResult[]> => {
    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode(
        {
          address: `${term}, ` + document.documentElement.lang,
          region: this.region ? this.region : undefined,
        },
        (results, status) => {
          if (status == google.maps.GeocoderStatus.OK) {
            this.results =
              results?.map(item => {
                const location = item.geometry.location;
                return {
                  latitude: parseFloat(location.lat().toString()),
                  longitude: parseFloat(location.lng().toString()),
                  name: item.formatted_address,
                  originalInfo: item,
                };
              }) || [];
            resolve(this.results);
          } else {
            this.results = [];
            reject({ results, status });
          }
        },
      );
    });
  };

  search = async (searchFor: string): Promise<SearchResult[]> => {
    return this._search(searchFor);
  };

  searchZip = (searchFor: string): Promise<SearchResult[]> => {
    return this._search(searchFor);
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
