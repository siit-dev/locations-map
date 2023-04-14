'use strict';

jest.mock('../dist/umd/index.js');

it('sets the css variables', () => {
  document.body.innerHTML = `
    <div class="page-header">
      Page Header
    </div>
  `;
});
