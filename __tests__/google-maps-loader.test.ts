/// <reference types="jest" />

const loadGoogleMapsLoader = async () => {
  jest.resetModules();

  const setOptions = jest.fn();
  const importLibrary = jest.fn((libraryName: string) => Promise.resolve({ libraryName }));

  jest.doMock('@googlemaps/js-api-loader', () => ({
    importLibrary,
    setOptions,
  }));

  const module = require('../src/map-providers/GoogleMaps/google-maps-loader');

  return {
    importLibrary,
    loadGoogleMapsAPI: module.loadGoogleMapsAPI,
    setOptions,
  };
};

beforeEach(() => {
  document.documentElement.lang = 'fr';
});

it('normalizes legacy Google Maps loader options for v2', async () => {
  const { importLibrary, loadGoogleMapsAPI, setOptions } = await loadGoogleMapsLoader();

  await loadGoogleMapsAPI({
    apiKey: 'legacy-key',
    version: 'weekly',
    libraries: ['places'],
  });

  expect(setOptions).toHaveBeenCalledWith({
    key: 'legacy-key',
    language: 'fr',
    libraries: ['places'],
    v: 'weekly',
  });
  expect(importLibrary).toHaveBeenCalledWith('maps');
  expect(importLibrary).toHaveBeenCalledWith('marker');
  expect(importLibrary).toHaveBeenCalledWith('places');
});

it('keeps v2 option names when both old and new names are present', async () => {
  const { loadGoogleMapsAPI, setOptions } = await loadGoogleMapsLoader();

  await loadGoogleMapsAPI({
    apiKey: 'legacy-key',
    key: 'v2-key',
    language: 'en',
    v: 'beta',
    version: 'weekly',
  });

  expect(setOptions).toHaveBeenCalledWith({
    key: 'v2-key',
    language: 'en',
    v: 'beta',
  });
});

it('configures the loader once while still importing new libraries', async () => {
  const { importLibrary, loadGoogleMapsAPI, setOptions } = await loadGoogleMapsLoader();

  await loadGoogleMapsAPI({ key: 'first-key' });
  await loadGoogleMapsAPI({ key: 'ignored-key', libraries: ['places'] });

  expect(setOptions).toHaveBeenCalledTimes(1);
  expect(importLibrary).toHaveBeenCalledTimes(3);
  expect(importLibrary).toHaveBeenLastCalledWith('places');
});
