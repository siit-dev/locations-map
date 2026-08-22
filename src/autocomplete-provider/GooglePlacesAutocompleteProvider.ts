import autoComplete from '@tarekraafat/autocomplete.js';
import Autocomplete from './Autocomplete';
import { AutocompleteSetupSettings } from './AutocompleteProvider.d';
import { SearchResult } from '../types/interfaces';
import type { AutoCompleteConfig } from '../types/autocomplete-config';

const placesRequestOptionKeys = [
  'includedPrimaryTypes',
  'includedRegionCodes',
  'inputOffset',
  'language',
  'locationBias',
  'locationRestriction',
  'origin',
  'region',
] as const;

type PlacesAutocompleteRequestOptions = Omit<google.maps.places.AutocompleteRequest, 'input' | 'sessionToken'>;

/**
 * Options for the Google Places Autocomplete Data API provider.
 *
 * `input` and `sessionToken` are owned by the provider. All other
 * AutocompleteRequest options can be combined with autoComplete.js settings.
 */
export type GooglePlacesAutocompleteProviderOptions = PlacesAutocompleteRequestOptions & Partial<AutoCompleteConfig>;

interface GooglePlacesPredictionItem {
  title: string;
  prediction: google.maps.places.PlacePrediction;
}

const googleMapsAttributionClass = 'locations-map-autocomplete-attribution';

const splitOptions = (options: GooglePlacesAutocompleteProviderOptions) => {
  const uiSettings = { ...options } as Record<string, unknown>;
  const requestOptions: Record<string, unknown> = {};

  placesRequestOptionKeys.forEach(key => {
    if (uiSettings[key] !== undefined) {
      requestOptions[key] = uiSettings[key];
    }
    delete uiSettings[key];
  });

  // These are provider-owned even if a JavaScript caller supplies them at runtime.
  delete uiSettings.input;
  delete uiSettings.sessionToken;

  return {
    uiSettings,
    requestOptions: requestOptions as PlacesAutocompleteRequestOptions,
  };
};

/**
 * autoComplete.js UI backed by the Maps JavaScript Place Autocomplete Data API.
 *
 * Predictions remain private to this provider. Place Details are fetched only
 * after the user selects a prediction, using the Essentials fields needed by
 * the LocationsMap search contract.
 */
export default class GooglePlacesAutocompleteProvider extends Autocomplete {
  private readonly requestOptions: PlacesAutocompleteRequestOptions;
  private placesLibraryPromise?: Promise<google.maps.PlacesLibrary>;
  private sessionToken?: google.maps.places.AutocompleteSessionToken;
  private suggestions: GooglePlacesPredictionItem[] = [];
  private requestVersion = 0;
  private cleanupInputListeners?: () => void;
  private attributionElement?: HTMLElement;

  constructor(options: GooglePlacesAutocompleteProviderOptions = {}) {
    const { uiSettings, requestOptions } = splitOptions(options);
    super(uiSettings as Partial<AutoCompleteConfig>);
    this.requestOptions = requestOptions;
  }

  setup = ({ input: setupInput, onSelect }: AutocompleteSetupSettings): this => {
    this.removeAttribution();
    this.autocomplete?.unInit?.();
    this.cleanupInputListeners?.();

    this.input = setupInput;
    if (!this.input) {
      throw new Error('Autocomplete input is not defined');
    }

    this.input.autocomplete = 'off';
    const configuredResultsList = this.settings.resultsList;
    const resultsList =
      configuredResultsList && typeof configuredResultsList === 'object'
        ? {
            ...configuredResultsList,
            element: this.composeResultsListElement(configuredResultsList.element),
          }
        : configuredResultsList;

    this.autocomplete = new autoComplete({
      ...this.settings,
      resultsList,
      data: {
        src: (query: string) => this.getSuggestions(query),
        keys: ['title'],
        cache: false,
      },
      selector: () => this.input,
    });

    const onSelection = (event: Event) => {
      const selection = (event as CustomEvent<{ selection?: { value?: GooglePlacesPredictionItem } }>).detail
        ?.selection;
      void this.selectPrediction(selection?.value?.prediction, onSelect);
    };
    this.input.addEventListener('selection', onSelection);

    const input = this.input;
    const form = input.form;
    const resetIfEmpty = () => {
      if (!input.value.trim()) {
        this.resetSession();
      }
    };
    const resetOnBlur = () => this.resetSession();
    const resetOnFormReset = () => this.resetSession();
    const resetOnClear = () => this.resetSession();
    const hideAttribution = () => this.removeAttribution();

    input.addEventListener('input', resetIfEmpty);
    input.addEventListener('blur', resetOnBlur);
    form?.addEventListener('reset', resetOnFormReset);
    input.addEventListener('clear', resetOnClear);
    input.addEventListener('close', hideAttribution);
    this.cleanupInputListeners = () => {
      input.removeEventListener('selection', onSelection);
      input.removeEventListener('input', resetIfEmpty);
      input.removeEventListener('blur', resetOnBlur);
      form?.removeEventListener('reset', resetOnFormReset);
      input.removeEventListener('clear', resetOnClear);
      input.removeEventListener('close', hideAttribution);
      this.removeAttribution();
    };

    return this;
  };

  private composeResultsListElement =
    (consumerElement?: (list: HTMLElement, data: any) => void) =>
    (list: HTMLElement, data: any): void => {
      consumerElement?.(list, data);

      if (!data?.results?.length) {
        this.removeAttribution();
        return;
      }

      const parent = list.parentElement;
      if (!parent) {
        return;
      }

      if (
        this.attributionElement?.parentElement === parent &&
        this.attributionElement.previousElementSibling === list
      ) {
        return;
      }

      this.removeAttribution();

      const attribution = document.createElement('div');
      attribution.className = googleMapsAttributionClass;
      attribution.setAttribute('role', 'note');
      attribution.tabIndex = -1;
      attribution.textContent = 'Google Maps';
      parent.insertBefore(attribution, list.nextSibling);
      this.attributionElement = attribution;
    };

  private removeAttribution = (): void => {
    this.attributionElement?.remove();
    this.attributionElement = undefined;
  };

  private loadPlacesLibrary = async (): Promise<google.maps.PlacesLibrary> => {
    if (!this.placesLibraryPromise) {
      const googleMaps = (globalThis as typeof globalThis & { google?: typeof google }).google?.maps;
      if (!googleMaps?.importLibrary) {
        throw new Error('Google Maps JavaScript API is not available');
      }

      this.placesLibraryPromise = Promise.resolve()
        .then(() => googleMaps.importLibrary('places'))
        .then(library => library as google.maps.PlacesLibrary)
        .catch(error => {
          this.placesLibraryPromise = undefined;
          throw error;
        });
    }

    return this.placesLibraryPromise;
  };

  private getSuggestions = async (query: string): Promise<GooglePlacesPredictionItem[]> => {
    if (!query.trim()) {
      this.resetSession();
      return [];
    }

    const requestVersion = ++this.requestVersion;
    this.suggestions = [];

    try {
      const places = await this.loadPlacesLibrary();
      if (requestVersion !== this.requestVersion) {
        return this.suggestions;
      }

      this.sessionToken ||= new places.AutocompleteSessionToken();

      const response = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        ...this.requestOptions,
        input: query,
        sessionToken: this.sessionToken,
      });

      if (requestVersion !== this.requestVersion) {
        return this.suggestions;
      }

      const results = (response.suggestions || [])
        .map(suggestion => suggestion.placePrediction)
        .filter((prediction): prediction is google.maps.places.PlacePrediction => !!prediction)
        .map(prediction => ({
          title: prediction.text?.text || prediction.mainText?.text || '',
          prediction,
        }))
        .filter(result => !!result.title);

      this.suggestions = results;
      return results;
    } catch (_error) {
      if (requestVersion === this.requestVersion) {
        this.resetSessionData();
        this.suggestions = [];
        return [];
      }
      return this.suggestions;
    }
  };

  private selectPrediction = async (
    prediction: google.maps.places.PlacePrediction | undefined,
    onSelect: (selected: SearchResult) => any | void,
  ): Promise<void> => {
    const selectionVersion = ++this.requestVersion;
    this.resetSessionData();

    try {
      if (!prediction) {
        return;
      }

      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['location', 'formattedAddress'] });

      // A second selection supersedes this one while its details are loading.
      if (selectionVersion !== this.requestVersion) {
        return;
      }

      const result = this.normalizePlace(place, prediction);
      if (result) {
        await onSelect(result);
      }
    } catch (_error) {
      // Places failures should not reject autoComplete.js event handling or move the map.
    } finally {
      if (selectionVersion === this.requestVersion) {
        this.resetSession();
      }
    }
  };

  private normalizePlace = (
    place: google.maps.places.Place,
    prediction: google.maps.places.PlacePrediction,
  ): SearchResult | null => {
    const location = place.location;
    if (!location) {
      return null;
    }

    const latitude = this.getCoordinate(location, 'lat');
    const longitude = this.getCoordinate(location, 'lng');
    if (latitude === null || longitude === null) {
      return null;
    }

    return {
      latitude,
      longitude,
      name: place.formattedAddress || prediction.text?.text || '',
    };
  };

  private getCoordinate = (
    location: google.maps.LatLng | google.maps.LatLngLiteral,
    method: 'lat' | 'lng',
  ): number | null => {
    const value =
      typeof (location as google.maps.LatLng)[method] === 'function'
        ? (location as google.maps.LatLng)[method]()
        : (location as google.maps.LatLngLiteral)[method];
    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : null;
  };

  private resetSessionData = () => {
    this.sessionToken = undefined;
    this.suggestions = [];
  };

  private resetSession = () => {
    this.requestVersion += 1;
    this.resetSessionData();
  };
}
