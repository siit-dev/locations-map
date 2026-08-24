jest.mock('@tarekraafat/autocomplete.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import Autocomplete from '../src/autocomplete-provider/Autocomplete';

const autoCompleteMock = jest.requireMock('@tarekraafat/autocomplete.js').default as jest.Mock;

beforeEach(() => {
  autoCompleteMock.mockReset();
});

it('converts rejected background result requests to an empty result list', async () => {
  const getResults = jest.fn().mockRejectedValue(new Error('geocoder unavailable'));
  const input = document.createElement('input');

  new Autocomplete().setup({
    getResults,
    input,
    onSelect: jest.fn(),
  });

  const config = autoCompleteMock.mock.calls[0][0];
  await expect(config.data.src()).resolves.toEqual([]);
  expect(getResults).toHaveBeenCalledTimes(1);
});

it('delegates manual starts to autoComplete.js', () => {
  const start = jest.fn();
  autoCompleteMock.mockImplementation(() => ({ start }));
  const input = document.createElement('input');
  const provider = new Autocomplete();

  provider.setup({
    getResults: jest.fn().mockResolvedValue([]),
    input,
    onSelect: jest.fn(),
  });

  provider.start?.('Nowhere');

  expect(start).toHaveBeenCalledWith('Nowhere');
});

it('passes an explicit query to the result loader', async () => {
  const getResults = jest.fn().mockResolvedValue([]);
  const input = document.createElement('input');

  new Autocomplete().setup({
    getResults,
    input,
    onSelect: jest.fn(),
  });

  const config = autoCompleteMock.mock.calls[0][0];
  await config.data.src('Paris');

  expect(getResults).toHaveBeenCalledWith('Paris');
});

it('normalizes manual queries once before calling the retained result loader', async () => {
  const normalize = jest.fn((value: string) => value.trim().toLowerCase());
  const getResults = jest.fn().mockResolvedValue([]);
  const input = document.createElement('input');
  const provider = new Autocomplete({ query: normalize });

  provider.setup({
    getResults,
    input,
    onSelect: jest.fn(),
  });

  await provider.getResults?.('  PARIS  ');

  expect(normalize).toHaveBeenCalledTimes(1);
  expect(getResults).toHaveBeenCalledWith('paris');
});

it('keeps autoComplete.js data sources on the raw retained loader', async () => {
  const normalize = jest.fn((value: string) => value.trim().toLowerCase());
  const getResults = jest.fn().mockResolvedValue([]);
  const input = document.createElement('input');
  const provider = new Autocomplete({ query: normalize });

  provider.setup({
    getResults,
    input,
    onSelect: jest.fn(),
  });

  const config = autoCompleteMock.mock.calls[0][0];
  await config.data.src('paris');

  expect(normalize).not.toHaveBeenCalled();
  expect(getResults).toHaveBeenCalledWith('paris');
});
