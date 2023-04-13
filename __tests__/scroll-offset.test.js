'use strict';

jest.mock('../lib/index.umd.js');

it('sets the css variables', () => {
  document.body.innerHTML = `
    <div class="page-header">
      Page Header
    </div>
  `;
});
