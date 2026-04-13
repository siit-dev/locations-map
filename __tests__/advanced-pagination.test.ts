/// <reference types="jest" />

import {
  AdvancedPagination,
  advancedPaginationDefaultSettings,
} from '../src/pagination-provider/AdvancedPagination';
import type { LocationsMap } from '../src/LocationsMap';
import type { LocationData } from '../src/types/interfaces.d';

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeLocations(count: number): LocationData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    latitude: 0,
    longitude: 0,
    name: `Location ${i + 1}`,
  }));
}

function makeParentMock(locations: LocationData[]): LocationsMap {
  return {
    get filteredLocations() {
      return locations;
    },
    generateLocationHTML: (location: LocationData) =>
      `<div class="location-wrapper location-item-wrapper" data-property="${location.id}">${location.name}</div>`,
    generateResultsCount: (count: number) =>
      count > 0 ? `<div class="results-count">${count} results</div>` : '',
  } as unknown as LocationsMap;
}

function makeTarget(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

// ── Global mocks ────────────────────────────────────────────────────────────────

beforeAll(() => {
  // jsdom does not implement IntersectionObserver
  global.IntersectionObserver = class {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    // Satisfy the interface
    root = null;
    rootMargin = '';
    thresholds = [];
    takeRecords = () => [];
  } as unknown as typeof IntersectionObserver;
});

// ── Default settings ──────────────────────────────────────────────────────────

describe('advancedPaginationDefaultSettings', () => {
  it('exports the expected defaults', () => {
    expect(advancedPaginationDefaultSettings.mode).toBe('numbered');
    expect(advancedPaginationDefaultSettings.itemsPerPage).toBe(5);
    expect(advancedPaginationDefaultSettings.siblingCount).toBe(1);
    expect(advancedPaginationDefaultSettings.boundaryCount).toBe(1);
    expect(advancedPaginationDefaultSettings.showStatus).toBe(false);
    expect(advancedPaginationDefaultSettings.infiniteMode).toBe('button');
  });
});

// ── Numbered mode ─────────────────────────────────────────────────────────────

describe('AdvancedPagination — numbered mode', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ── update / initial render ────────────────────────────────────────────────

  describe('update()', () => {
    it('renders only the first page of items in the DOM', () => {
      const pagination = new AdvancedPagination({ itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(10))).setTarget(target).update();

      const items = target.querySelectorAll('ul.locations-list-inner li');
      expect(items).toHaveLength(3);
      expect(items[0].textContent).toContain('Location 1');
      expect(items[2].textContent).toContain('Location 3');
    });

    it('sets target.id to "locations-list"', () => {
      const target = makeTarget();
      new AdvancedPagination({ itemsPerPage: 3 })
        .setParent(makeParentMock(makeLocations(6)))
        .setTarget(target)
        .update();

      expect(target.id).toBe('locations-list');
    });

    it('renders pagination controls when total > itemsPerPage', () => {
      const target = makeTarget();
      new AdvancedPagination({ itemsPerPage: 3 })
        .setParent(makeParentMock(makeLocations(10)))
        .setTarget(target)
        .update();

      expect(target.querySelector('[data-pagination-controls]')).not.toBeNull();
      expect(target.querySelectorAll('[data-page]').length).toBeGreaterThan(0);
    });

    it('does not render pagination controls when all items fit on one page', () => {
      const target = makeTarget();
      new AdvancedPagination({ itemsPerPage: 10 })
        .setParent(makeParentMock(makeLocations(5)))
        .setTarget(target)
        .update();

      expect(target.querySelector('[data-pagination-controls]')).toBeNull();
    });

    it('includes results count from parent.generateResultsCount()', () => {
      const target = makeTarget();
      new AdvancedPagination({ itemsPerPage: 3 })
        .setParent(makeParentMock(makeLocations(9)))
        .setTarget(target)
        .update();

      expect(target.querySelector('.results-count')?.textContent).toBe('9 results');
    });

    it('dispatches advancedPagination:ready event', () => {
      const target = makeTarget();
      const handler = jest.fn();
      target.addEventListener('advancedPagination:ready', handler);

      new AdvancedPagination({ itemsPerPage: 3 })
        .setParent(makeParentMock(makeLocations(9)))
        .setTarget(target)
        .update();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('clears and re-renders the render cache on each call', () => {
      const locations = makeLocations(6);
      const pagination = new AdvancedPagination({ itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(locations)).setTarget(target).update();

      const firstLi = target.querySelector('ul.locations-list-inner li')!;

      // Second call to update() clears the cache — new nodes are created
      pagination.update();

      const newFirstLi = target.querySelector('ul.locations-list-inner li')!;
      expect(newFirstLi).not.toBe(firstLi);
    });
  });

  // ── goToPage ───────────────────────────────────────────────────────────────

  describe('goToPage()', () => {
    it('shows items for the requested page', () => {
      const pagination = new AdvancedPagination({ itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(10))).setTarget(target).update();

      pagination.goToPage(2);

      const items = target.querySelectorAll('ul.locations-list-inner li');
      expect(items).toHaveLength(3);
      expect(items[0].textContent).toContain('Location 4');
      expect(items[2].textContent).toContain('Location 6');
    });

    it('shows fewer items on the last page when total is not evenly divisible', () => {
      const pagination = new AdvancedPagination({ itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(10))).setTarget(target).update();

      pagination.goToPage(4); // page 4: only Location 10

      const items = target.querySelectorAll('ul.locations-list-inner li');
      expect(items).toHaveLength(1);
      expect(items[0].textContent).toContain('Location 10');
    });

    it('clamps page above total page count to the last page', () => {
      const pagination = new AdvancedPagination({ itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(10))).setTarget(target).update();

      pagination.goToPage(9999);

      const items = target.querySelectorAll('ul.locations-list-inner li');
      expect(items[0].textContent).toContain('Location 10');
    });

    it('clamps page below 1 to page 1', () => {
      const pagination = new AdvancedPagination({ itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(9))).setTarget(target).update();

      pagination.goToPage(-5);

      const items = target.querySelectorAll('ul.locations-list-inner li');
      expect(items[0].textContent).toContain('Location 1');
    });

    it('reuses the same <li> node when returning to a previously visited page', () => {
      const pagination = new AdvancedPagination({ itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(6))).setTarget(target).update();

      const originalLi = target.querySelector('ul.locations-list-inner li')!;

      pagination.goToPage(2);
      pagination.goToPage(1);

      const reusedLi = target.querySelector('ul.locations-list-inner li')!;
      expect(reusedLi).toBe(originalLi);
    });

    it('dispatches advancedPagination:pageChange with the correct page number', () => {
      const pagination = new AdvancedPagination({ itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(9))).setTarget(target).update();

      const handler = jest.fn();
      target.addEventListener('advancedPagination:pageChange', handler);
      pagination.goToPage(2);

      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0][0] as CustomEvent).detail.currentPage).toBe(2);
      expect((handler.mock.calls[0][0] as CustomEvent).detail.totalPages).toBe(3);
    });
  });

  // ── Page range / ellipsis algorithm ───────────────────────────────────────

  describe('page range algorithm (MUI-style ellipsis)', () => {
    it('shows ellipsis on both sides when on a middle page with enough total pages', () => {
      // 20 locations, 3 per page → 7 pages. Page 4 (middle): 1 … 3 4 5 … 7
      const pagination = new AdvancedPagination({
        itemsPerPage: 3,
        siblingCount: 1,
        boundaryCount: 1,
      });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(20))).setTarget(target).update();

      pagination.goToPage(4);

      const ellipsis = target.querySelectorAll('.pagination__ellipsis');
      expect(ellipsis).toHaveLength(2);
    });

    it('shows no ellipsis when all pages fit without gaps', () => {
      // 6 locations, 3 per page → 2 pages, no ellipsis needed
      const pagination = new AdvancedPagination({
        itemsPerPage: 3,
        siblingCount: 1,
        boundaryCount: 1,
      });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(6))).setTarget(target).update();

      const ellipsis = target.querySelectorAll('.pagination__ellipsis');
      expect(ellipsis).toHaveLength(0);
    });

    it('shows only one ellipsis when near the start', () => {
      // 20 locations, 3/page = 7 pages. Page 1: 1 2 … 7
      const pagination = new AdvancedPagination({
        itemsPerPage: 3,
        siblingCount: 1,
        boundaryCount: 1,
      });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(20))).setTarget(target).update();

      // page 1 (default)
      const ellipsis = target.querySelectorAll('.pagination__ellipsis');
      expect(ellipsis).toHaveLength(1);
    });

    it('renders prev button disabled on page 1', () => {
      const target = makeTarget();
      new AdvancedPagination({ itemsPerPage: 3, showPrevNext: true })
        .setParent(makeParentMock(makeLocations(9)))
        .setTarget(target)
        .update();

      const prevBtn = target.querySelector('[aria-label="Previous page"]');
      expect(prevBtn?.closest('.page-item')?.classList.contains('disabled')).toBe(true);
      expect(prevBtn?.hasAttribute('data-page')).toBe(false);
    });

    it('renders next button disabled on the last page', () => {
      const pagination = new AdvancedPagination({ itemsPerPage: 3, showPrevNext: true });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(6))).setTarget(target).update();

      pagination.goToPage(2); // last page

      const nextBtn = target.querySelector('[aria-label="Next page"]');
      expect(nextBtn?.closest('.page-item')?.classList.contains('disabled')).toBe(true);
    });

    it('marks the current page <li> with aria-current="page"', () => {
      const pagination = new AdvancedPagination({ itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(9))).setTarget(target).update();

      pagination.goToPage(2);

      const currentLi = target.querySelector('[aria-current="page"]');
      expect(currentLi).not.toBeNull();
      expect(currentLi?.textContent?.trim()).toBe('2');
    });

    it('renders first/last buttons when showFirstLast is true', () => {
      const target = makeTarget();
      new AdvancedPagination({ itemsPerPage: 3, showFirstLast: true })
        .setParent(makeParentMock(makeLocations(9)))
        .setTarget(target)
        .update();

      expect(target.querySelector('[aria-label="First page"]')).not.toBeNull();
      expect(target.querySelector('[aria-label="Last page"]')).not.toBeNull();
    });

    it('uses custom prev/next labels', () => {
      const target = makeTarget();
      new AdvancedPagination({ itemsPerPage: 3, showPrevNext: true, prevText: 'Prev', nextText: 'Next' })
        .setParent(makeParentMock(makeLocations(9)))
        .setTarget(target)
        .update();

      const prevBtn = target.querySelector('[aria-label="Previous page"]');
      const nextBtn = target.querySelector('[aria-label="Next page"]');
      expect(prevBtn?.textContent).toBe('Prev');
      expect(nextBtn?.textContent).toBe('Next');
    });
  });

  // ── Status bar ─────────────────────────────────────────────────────────────

  describe('status bar (showStatus)', () => {
    it('does not render status by default', () => {
      const target = makeTarget();
      new AdvancedPagination({ itemsPerPage: 3 })
        .setParent(makeParentMock(makeLocations(9)))
        .setTarget(target)
        .update();

      expect(target.querySelector('.pagination-info')).toBeNull();
    });

    it('renders status with default text replacing [end] and [total]', () => {
      const target = makeTarget();
      new AdvancedPagination({ itemsPerPage: 3, showStatus: true })
        .setParent(makeParentMock(makeLocations(9)))
        .setTarget(target)
        .update();

      // Default: "You have seen [end] items of [total]" → "You have seen 3 items of 9"
      expect(target.querySelector('.pagination-info p')?.textContent).toBe(
        'You have seen 3 items of 9',
      );
    });

    it('updates status text after goToPage()', () => {
      const pagination = new AdvancedPagination({
        itemsPerPage: 3,
        showStatus: true,
        statusText: 'Showing [start]–[end] of [total]',
      });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(9))).setTarget(target).update();

      pagination.goToPage(2);

      expect(target.querySelector('.pagination-info p')?.textContent).toBe('Showing 4–6 of 9');
    });

    it('replaces all four placeholders correctly', () => {
      const pagination = new AdvancedPagination({
        itemsPerPage: 3,
        showStatus: true,
        statusText: '[start],[end],[count],[total]',
      });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(9))).setTarget(target).update();

      // page 1: start=1, end=3, count=end=3, total=9
      expect(target.querySelector('.pagination-info p')?.textContent).toBe('1,3,3,9');
    });

    it('respects custom statusWrapperClass and statusItemTag', () => {
      const target = makeTarget();
      new AdvancedPagination({
        itemsPerPage: 3,
        showStatus: true,
        statusWrapperClass: 'my-status',
        statusItemTag: 'span',
      })
        .setParent(makeParentMock(makeLocations(9)))
        .setTarget(target)
        .update();

      expect(target.querySelector('.my-status span')).not.toBeNull();
    });
  });

  // ── Click delegation ───────────────────────────────────────────────────────

  describe('click delegation', () => {
    it('navigates to page when a [data-page] link is clicked', () => {
      const pagination = new AdvancedPagination({ itemsPerPage: 3, showPrevNext: false });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(9))).setTarget(target).update();

      target.querySelector<HTMLElement>('[data-page="2"]')?.click();

      const items = target.querySelectorAll('ul.locations-list-inner li');
      expect(items[0].textContent).toContain('Location 4');
    });

    it('navigates via prev/next buttons', () => {
      const pagination = new AdvancedPagination({ itemsPerPage: 3, showPrevNext: true });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(9))).setTarget(target).update();

      target.querySelector<HTMLElement>('[aria-label="Next page"]')?.click();

      const items = target.querySelectorAll('ul.locations-list-inner li');
      expect(items[0].textContent).toContain('Location 4');
    });
  });

  // ── clear ──────────────────────────────────────────────────────────────────

  describe('clear()', () => {
    it('empties the target element', () => {
      const pagination = new AdvancedPagination({ itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(9))).setTarget(target).update();

      pagination.clear();

      expect(target.innerHTML).toBe('');
    });
  });

  // ── Custom HTML structure ──────────────────────────────────────────────────

  describe('configurable HTML structure', () => {
    it('uses custom wrapper tag and class', () => {
      const target = makeTarget();
      new AdvancedPagination({
        itemsPerPage: 3,
        wrapperTag: 'section',
        wrapperClass: 'my-pagination',
      })
        .setParent(makeParentMock(makeLocations(9)))
        .setTarget(target)
        .update();

      const wrapper = target.querySelector('section.my-pagination');
      expect(wrapper).not.toBeNull();
    });

    it('adds extra classes to the wrapper in numbered mode', () => {
      const target = makeTarget();
      new AdvancedPagination({
        itemsPerPage: 3,
        wrapperExtraClassesNumbered: 'numbered-extra',
      })
        .setParent(makeParentMock(makeLocations(9)))
        .setTarget(target)
        .update();

      expect(target.querySelector('.numbered-extra')).not.toBeNull();
    });
  });
});

// ── Infinite mode ─────────────────────────────────────────────────────────────

describe('AdvancedPagination — infinite mode', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('update()', () => {
    it('renders the first batch of items', () => {
      const target = makeTarget();
      new AdvancedPagination({ mode: 'infinite', itemsPerPage: 3 })
        .setParent(makeParentMock(makeLocations(10)))
        .setTarget(target)
        .update();

      const items = target.querySelectorAll('ul.locations-list-inner li');
      expect(items).toHaveLength(3);
      expect(items[0].textContent).toContain('Location 1');
    });

    it('renders a load-more button when items remain', () => {
      const target = makeTarget();
      new AdvancedPagination({ mode: 'infinite', itemsPerPage: 3, infiniteMode: 'button' })
        .setParent(makeParentMock(makeLocations(10)))
        .setTarget(target)
        .update();

      expect(target.querySelector('[data-load-more]')).not.toBeNull();
    });

    it('does not render a load-more button when all items are already loaded', () => {
      const target = makeTarget();
      new AdvancedPagination({ mode: 'infinite', itemsPerPage: 10, infiniteMode: 'button' })
        .setParent(makeParentMock(makeLocations(5)))
        .setTarget(target)
        .update();

      expect(target.querySelector('[data-load-more]')).toBeNull();
    });

    it('adds the sentinel div when infiniteMode includes scroll', () => {
      const target = makeTarget();
      new AdvancedPagination({ mode: 'infinite', itemsPerPage: 3, infiniteMode: 'scroll' })
        .setParent(makeParentMock(makeLocations(10)))
        .setTarget(target)
        .update();

      expect(target.querySelector('[data-pagination-sentinel]')).not.toBeNull();
    });

    it('adds both button and sentinel when infiniteMode is "both"', () => {
      const target = makeTarget();
      new AdvancedPagination({ mode: 'infinite', itemsPerPage: 3, infiniteMode: 'both' })
        .setParent(makeParentMock(makeLocations(10)))
        .setTarget(target)
        .update();

      expect(target.querySelector('[data-load-more]')).not.toBeNull();
      expect(target.querySelector('[data-pagination-sentinel]')).not.toBeNull();
    });

    it('adds extra classes to the wrapper in infinite mode', () => {
      const target = makeTarget();
      new AdvancedPagination({
        mode: 'infinite',
        itemsPerPage: 3,
        wrapperExtraClassesInfinite: 'infinite-extra',
      })
        .setParent(makeParentMock(makeLocations(10)))
        .setTarget(target)
        .update();

      expect(target.querySelector('.infinite-extra')).not.toBeNull();
    });
  });

  // ── loadMore ───────────────────────────────────────────────────────────────

  describe('loadMore()', () => {
    it('appends the next batch of items to the existing list', () => {
      const pagination = new AdvancedPagination({ mode: 'infinite', itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(10))).setTarget(target).update();

      pagination.loadMore(); // 3 → 6

      const items = target.querySelectorAll('ul.locations-list-inner li');
      expect(items).toHaveLength(6);
      expect(items[3].textContent).toContain('Location 4');
    });

    it('caps the loaded count at the total number of items', () => {
      const pagination = new AdvancedPagination({ mode: 'infinite', itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(7))).setTarget(target).update();

      pagination.loadMore(); // 3 → 6
      pagination.loadMore(); // 6 → 7 (only 1 more available)

      const items = target.querySelectorAll('ul.locations-list-inner li');
      expect(items).toHaveLength(7);
    });

    it('removes the load-more button when all items are loaded', () => {
      const pagination = new AdvancedPagination({
        mode: 'infinite',
        itemsPerPage: 3,
        infiniteMode: 'button',
      });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(6))).setTarget(target).update();

      pagination.loadMore(); // loads all 6

      expect(target.querySelector('[data-load-more]')).toBeNull();
    });

    it('does nothing when all items are already loaded', () => {
      const pagination = new AdvancedPagination({ mode: 'infinite', itemsPerPage: 10 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(5))).setTarget(target).update();

      pagination.loadMore(); // no-op

      expect(target.querySelectorAll('ul.locations-list-inner li')).toHaveLength(5);
    });

    it('reuses cached <li> nodes for already-loaded items', () => {
      const pagination = new AdvancedPagination({ mode: 'infinite', itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(6))).setTarget(target).update();

      const firstLiBefore = target.querySelector('ul.locations-list-inner li')!;

      pagination.loadMore();

      const firstLiAfter = target.querySelector('ul.locations-list-inner li')!;
      expect(firstLiAfter).toBe(firstLiBefore);
    });

    it('dispatches advancedPagination:loadMore with correct loadedCount', () => {
      const pagination = new AdvancedPagination({ mode: 'infinite', itemsPerPage: 3 });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(9))).setTarget(target).update();

      const handler = jest.fn();
      target.addEventListener('advancedPagination:loadMore', handler);
      pagination.loadMore();

      expect(handler).toHaveBeenCalledTimes(1);
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.loadedCount).toBe(6);
      expect(detail.total).toBe(9);
    });

    it('updates the status text after each loadMore call', () => {
      const pagination = new AdvancedPagination({
        mode: 'infinite',
        itemsPerPage: 3,
        showStatus: true,
        statusText: '[end] of [total]',
      });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(9))).setTarget(target).update();

      expect(target.querySelector('.pagination-info p')?.textContent).toBe('3 of 9');

      pagination.loadMore();
      expect(target.querySelector('.pagination-info p')?.textContent).toBe('6 of 9');

      pagination.loadMore();
      expect(target.querySelector('.pagination-info p')?.textContent).toBe('9 of 9');
    });
  });

  // ── Click delegation ───────────────────────────────────────────────────────

  describe('click delegation on load-more button', () => {
    it('calls loadMore when the [data-load-more] button is clicked', () => {
      const pagination = new AdvancedPagination({
        mode: 'infinite',
        itemsPerPage: 3,
        infiniteMode: 'button',
      });
      const target = makeTarget();
      pagination.setParent(makeParentMock(makeLocations(9))).setTarget(target).update();

      target.querySelector<HTMLElement>('[data-load-more]')?.click();

      expect(target.querySelectorAll('ul.locations-list-inner li')).toHaveLength(6);
    });
  });
});

// ── setParent / setTarget chaining ────────────────────────────────────────────

describe('AdvancedPagination — chaining API', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns `this` from setParent, setTarget, update, clear', () => {
    const pagination = new AdvancedPagination({ itemsPerPage: 3 });
    const target = makeTarget();
    const parent = makeParentMock(makeLocations(6));

    expect(pagination.setParent(parent)).toBe(pagination);
    expect(pagination.setTarget(target)).toBe(pagination);
    expect(pagination.update()).toBe(pagination);
    expect(pagination.clear()).toBe(pagination);
  });
});
