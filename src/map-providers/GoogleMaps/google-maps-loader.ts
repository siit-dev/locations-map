import { APIOptions, importLibrary, setOptions } from '@googlemaps/js-api-loader';

export interface LegacyGoogleMapsAPIOptions {
  apiKey?: string;
  version?: string;
}

export type GoogleMapsAPIOptions = APIOptions & LegacyGoogleMapsAPIOptions;

let isConfigured = false;
const loadingLibraries: Record<string, Promise<unknown>> = {};

const normalizeOptions = (options: GoogleMapsAPIOptions): APIOptions => {
  const { apiKey, version, ...apiOptions } = options;

  return {
    language: document.documentElement.lang,
    ...apiOptions,
    key: apiOptions.key || apiKey,
    v: apiOptions.v || version,
  };
};

const loadLibrary = (libraryName: string): Promise<unknown> => {
  if (!loadingLibraries[libraryName]) {
    loadingLibraries[libraryName] = importLibrary(libraryName as Parameters<typeof importLibrary>[0]);
  }

  return loadingLibraries[libraryName];
};

/**
 * return a promise for when the maps API has started
 *
 * @param {object} options extra options for the loader
 */
export const loadGoogleMapsAPI = async (options: GoogleMapsAPIOptions) => {
  const normalizedOptions = normalizeOptions(options);
  const libraries = new Set(['maps', 'marker', ...(normalizedOptions.libraries || [])]);

  if (!isConfigured) {
    setOptions(normalizedOptions);
    isConfigured = true;
  }

  await Promise.all([...libraries].map(loadLibrary));
};
