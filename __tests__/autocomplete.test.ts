jest.mock('@tarekraafat/autocomplete.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import Autocomplete from '../src/autocomplete-provider/Autocomplete';

it('converts rejected background result requests to an empty result list', async () => {
  const autoCompleteMock = jest.requireMock('@tarekraafat/autocomplete.js').default as jest.Mock;
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
