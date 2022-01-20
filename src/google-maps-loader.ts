import { Loader } from '@googlemaps/js-api-loader';

/**
 * return a promise for when the maps API has started
 *
 * @param {object} options extra options for the loader
 */
export const loadGoogleMapsAPI = async options => {
  const loader = new Loader({
    language: document.documentElement.lang,
    ...options,
  });

  await loader.load();
};
