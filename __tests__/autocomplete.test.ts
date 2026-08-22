jest.mock('@tarekraafat/autocomplete.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import Autocomplete, { defaultSettings } from '../src/autocomplete-provider/Autocomplete';

const autoCompleteMock = jest.requireMock('@tarekraafat/autocomplete.js').default as jest.Mock;

beforeEach(() => {
  autoCompleteMock.mockClear();
});

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

it('renders result titles as text instead of interpreting markup', () => {
  const source = document.createElement('li');

  defaultSettings.resultItem?.element?.(source, {
    value: { title: '<img src="x" onerror="alert(1)">Paris' },
  });

  expect(source.textContent).toBe('<img src="x" onerror="alert(1)">Paris');
  expect(source.querySelector('img')).toBeNull();
});

it('preserves a consumer-supplied result renderer', () => {
  const element = jest.fn();
  const input = document.createElement('input');

  new Autocomplete({ resultItem: { element } }).setup({
    getResults: jest.fn().mockResolvedValue([]),
    input,
    onSelect: jest.fn(),
  });

  const config = autoCompleteMock.mock.calls[0][0];
  expect(config.resultItem.element).toBe(element);
});
