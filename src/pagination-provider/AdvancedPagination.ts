import type { LocationsMap } from '..';
import type { LocationData } from '../types/interfaces.d';
import { AdvancedPaginationProvider } from './AdvancedPaginationProvider';

export interface AdvancedPaginationSettings {
  // ── Core ───────────────────────────────────────────────────────────────────
  /** @default 'numbered' */
  mode?: 'numbered' | 'infinite';
  /** Number of items shown per page / per load-more batch. @default 5 */
  itemsPerPage?: number;

  // ── Numbered pagination ────────────────────────────────────────────────────
  /** Pages shown on either side of the current page. @default 1 */
  siblingCount?: number;
  /** Pages always shown at the start and end of the range. @default 1 */
  boundaryCount?: number;
  /** Whether to show previous/next buttons. @default true */
  showPrevNext?: boolean;
  /** Label for the previous button. @default '‹' */
  prevText?: string;
  /** Label for the next button. @default '›' */
  nextText?: string;
  /** Whether to show first/last page buttons (« / »). @default false */
  showFirstLast?: boolean;
  /** Scroll the list container to its top on page change. @default false */
  scrollToTopOnPageChange?: boolean;
  /** Extra CSS classes appended to the wrapper in numbered mode. @default '' */
  wrapperExtraClassesNumbered?: string;

  // ── Infinite pagination ────────────────────────────────────────────────────
  /**
   * How infinite loading is triggered.
   * - `'button'` — a "Load more" button.
   * - `'scroll'` — auto-loads via IntersectionObserver when the sentinel is visible.
   * - `'both'` — button + auto-scroll.
   * @default 'button'
   */
  infiniteMode?: 'button' | 'scroll' | 'both';
  /** Label for the load-more button. @default 'Load more' */
  loadMoreText?: string;
  /** CSS class(es) for the load-more button. @default 'pagination__load-more' */
  loadMoreButtonClass?: string;
  /** Extra CSS classes appended to the wrapper in infinite mode. @default '' */
  wrapperExtraClassesInfinite?: string;

  // ── Pagination status ──────────────────────────────────────────────────────
  /**
   * Show a status line above the pagination controls / load-more button.
   * @default false
   */
  showStatus?: boolean;
  /**
   * Status text template. Supports the following placeholders:
   * - `[count]`  — number of items seen so far (= `[end]`)
   * - `[total]`  — total number of filtered items
   * - `[start]`  — first item index of the current page/batch (1-based)
   * - `[end]`    — last item index of the current page/batch (1-based)
   * @default 'You have seen [end] items of [total]'
   */
  statusText?: string;
  /** Wrapper tag for the status element. @default 'div' */
  statusWrapperTag?: string;
  /** CSS class(es) for the status wrapper. @default 'pagination-info' */
  statusWrapperClass?: string;
  /** Inner tag for the status text. @default 'p' */
  statusItemTag?: string;

  // ── HTML structure ─────────────────────────────────────────────────────────
  /** Tag for the outermost pagination wrapper. @default 'div' */
  wrapperTag?: string;
  /** CSS class(es) for the outermost pagination wrapper. @default 'pagination-wrapper' */
  wrapperClass?: string;
  /** Tag for the `<nav>` element (numbered mode). @default 'nav' */
  navTag?: string;
  /** CSS class(es) for the `<nav>` element. @default 'pagination' */
  navClass?: string;
  /** `aria-label` value for the `<nav>` element. @default 'Pagination' */
  navAriaLabel?: string;
  /** Tag for the page list. @default 'ul' */
  listTag?: string;
  /** CSS class(es) for the page list. @default 'pagination__list pagination' */
  listClass?: string;
  /** Tag for each page item. @default 'li' */
  itemTag?: string;
  /** CSS class(es) for each page item. @default 'page-item' */
  itemClass?: string;
  /** Tag for a clickable page link. @default 'a' */
  linkTag?: string;
  /** CSS class(es) for a clickable page link. @default 'pagination__item link page-link' */
  linkClass?: string;
  /** Tag used for the current (non-linked) page item. @default 'span' */
  currentItemTag?: string;
  /** CSS class(es) for the current page item. @default 'pagination__item' */
  currentItemClass?: string;
  /** Class added to the `<li>` of the active page. @default 'active' */
  activeClass?: string;
  /** Class added to the `<li>` of a disabled prev/next button. @default 'disabled' */
  disabledClass?: string;
}

export const advancedPaginationDefaultSettings: Required<AdvancedPaginationSettings> = {
  mode: 'numbered',
  itemsPerPage: 5,
  siblingCount: 1,
  boundaryCount: 1,
  showPrevNext: true,
  prevText: '‹',
  nextText: '›',
  showFirstLast: false,
  scrollToTopOnPageChange: false,
  wrapperExtraClassesNumbered: '',
  infiniteMode: 'button',
  loadMoreText: 'Load more',
  loadMoreButtonClass: 'pagination__load-more',
  wrapperExtraClassesInfinite: '',
  showStatus: false,
  statusText: 'You have seen [end] items of [total]',
  statusWrapperTag: 'div',
  statusWrapperClass: 'pagination-info',
  statusItemTag: 'p',
  wrapperTag: 'div',
  wrapperClass: 'pagination-wrapper',
  navTag: 'nav',
  navClass: 'pagination',
  navAriaLabel: 'Pagination',
  listTag: 'ul',
  listClass: 'pagination__list pagination',
  itemTag: 'li',
  itemClass: 'page-item',
  linkTag: 'a',
  linkClass: 'pagination__item link page-link',
  currentItemTag: 'span',
  currentItemClass: 'pagination__item',
  activeClass: 'active',
  disabledClass: 'disabled',
};

/**
 * A local, dependency-free alternative to the list.js-based `Pagination` class.
 *
 * Features:
 * - Numbered pagination with configurable MUI-style ellipsis algorithm
 * - Infinite pagination (button click, IntersectionObserver scroll, or both)
 * - Optional status bar with configurable text and placeholders
 * - Fully configurable HTML structure and CSS classes
 * - DOM virtualization: only the current page's `<li>` nodes are in the DOM
 * - Live `HTMLElement` cache: cached nodes are re-inserted, not re-parsed —
 *   preserving web component lifecycle state across page changes
 */
export class AdvancedPagination extends AdvancedPaginationProvider {
  protected settings: Required<AdvancedPaginationSettings>;

  #currentPage = 1;
  #loadedCount = 0;

  /**
   * Stores live `<li>` DOM nodes for each rendered location, keyed by `location.id`.
   * Nodes are re-inserted via `appendChild` rather than re-serialized via `innerHTML`,
   * so custom elements (web components) inside them retain their internal state and
   * event listeners across page/load-more changes.
   */
  #renderedCache = new Map<string | number, HTMLElement>();

  #intersectionObserver: IntersectionObserver | null = null;
  #clickListener: ((e: Event) => void) | null = null;

  constructor(settings: AdvancedPaginationSettings = {}) {
    super();
    this.settings = { ...advancedPaginationDefaultSettings, ...settings };
    this.#loadedCount = this.settings.itemsPerPage;
  }

  // ── Abstract implementations ───────────────────────────────────────────────

  setParent = (parent: LocationsMap): this => {
    this.parent = parent;
    return this;
  };

  setTarget = (target: HTMLElement): this => {
    this.target = target;
    return this;
  };

  /**
   * Full re-render. Clears the render cache (distances/sort order may have changed),
   * resets to page 1, and rebuilds the entire target element.
   */
  update = (): this => {
    if (!this.parent || !this.target) return this;

    this.#renderedCache.clear();
    this.#currentPage = 1;
    this.#loadedCount = this.settings.itemsPerPage;
    this.target.id = 'locations-list';

    this.#disconnectObserver();
    this.#removeClickListener();
    this.target.innerHTML = '';

    const locations = this.parent.filteredLocations;

    if (this.settings.mode === 'infinite') {
      this.#renderInfinite(locations);
    } else {
      this.#renderNumbered(locations);
    }

    this.#attachClickListener();
    this.#dispatchPaginationEvent('advancedPagination:ready', { currentPage: this.#currentPage });
    return this;
  };

  /**
   * Resets state, disconnects the observer and empties the target element.
   */
  clear = (): this => {
    this.#currentPage = 1;
    this.#loadedCount = this.settings.itemsPerPage;
    this.#renderedCache.clear();
    this.#disconnectObserver();
    this.#removeClickListener();
    if (this.target) {
      this.target.innerHTML = '';
    }
    return this;
  };

  // ── Public navigation API ─────────────────────────────────────────────────

  /**
   * Navigate to a specific page (numbered mode).
   * Does **not** clear the render cache — web component state is preserved.
   */
  goToPage = (page: number): this => {
    if (!this.parent || !this.target) return this;

    const locations = this.parent.filteredLocations;
    const totalPages = this.#getTotalPages(locations.length);
    this.#currentPage = Math.max(1, Math.min(page, totalPages));

    // Replace only the item list — cached <li> nodes are reused
    const pageItems = this.#getPageItems(locations);
    const newList = this.#renderItems(pageItems);
    const oldList = this.target.querySelector<HTMLElement>('ul.locations-list-inner');

    if (oldList) {
      oldList.replaceWith(newList);
    } else {
      this.target.appendChild(newList);
    }

    // Replace pagination controls in-place
    const oldControls = this.target.querySelector<HTMLElement>('[data-pagination-controls]');
    if (totalPages > 1) {
      const newControlsHtml = this.#buildFullControlsHtml(this.#currentPage, totalPages, locations.length);
      const temp = document.createElement('div');
      temp.innerHTML = newControlsHtml;
      const newControls = temp.firstElementChild as HTMLElement;
      if (oldControls) {
        oldControls.replaceWith(newControls);
      } else {
        this.target.appendChild(newControls);
      }
    } else if (oldControls) {
      oldControls.remove();
    }

    if (this.settings.scrollToTopOnPageChange) {
      this.target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    this.#dispatchPaginationEvent('advancedPagination:pageChange', { currentPage: this.#currentPage, totalPages });
    return this;
  };

  /**
   * Load the next batch of items (infinite mode).
   * Appends newly visible `<li>` nodes from cache; web component state is preserved.
   */
  loadMore = (): this => {
    if (!this.parent || !this.target) return this;

    const locations = this.parent.filteredLocations;
    const total = locations.length;
    if (this.#loadedCount >= total) return this;

    const prevCount = this.#loadedCount;
    this.#loadedCount = Math.min(this.#loadedCount + this.settings.itemsPerPage, total);

    // Append new <li> nodes to the existing <ul>
    const ul = this.target.querySelector<HTMLUListElement>('ul.locations-list-inner');
    if (ul) {
      const newItems = locations.slice(prevCount, this.#loadedCount);
      for (const location of newItems) {
        ul.appendChild(this.#renderItem(location));
      }
    }

    // Replace controls (status + button + sentinel)
    const hasMore = this.#loadedCount < total;
    const newControlsHtml = this.#buildInfiniteControlsHtml(this.#loadedCount, total, hasMore);
    const temp = document.createElement('div');
    temp.innerHTML = newControlsHtml;
    const newControls = temp.firstElementChild as HTMLElement;
    const oldControls = this.target.querySelector<HTMLElement>('[data-pagination-controls]');

    if (oldControls) {
      oldControls.replaceWith(newControls);
    } else if (hasMore || this.settings.showStatus) {
      this.target.appendChild(newControls);
    }

    // Re-attach IntersectionObserver to the new sentinel element
    if (hasMore && (this.settings.infiniteMode === 'scroll' || this.settings.infiniteMode === 'both')) {
      const sentinel = newControls.querySelector<HTMLElement>('[data-pagination-sentinel]');
      if (sentinel) this.#setupIntersectionObserver(sentinel);
    } else {
      this.#disconnectObserver();
    }

    this.#dispatchPaginationEvent('advancedPagination:loadMore', { loadedCount: this.#loadedCount, total });
    return this;
  };

  // ── Private rendering ─────────────────────────────────────────────────────

  #renderNumbered(locations: LocationData[]): void {
    const total = locations.length;
    const totalPages = this.#getTotalPages(total);

    // Results count — static HTML from parent template
    const countHtml = this.parent!.generateResultsCount(total);
    if (countHtml) {
      this.target!.insertAdjacentHTML('beforeend', countHtml);
    }

    // Item nodes for the current page — live DOM, never serialised
    this.target!.appendChild(this.#renderItems(this.#getPageItems(locations)));

    // Pagination controls — static HTML (no components inside)
    if (totalPages > 1) {
      this.target!.insertAdjacentHTML(
        'beforeend',
        this.#buildFullControlsHtml(this.#currentPage, totalPages, total),
      );
    }
  }

  #renderInfinite(locations: LocationData[]): void {
    const total = locations.length;
    const count = Math.min(this.#loadedCount, total);

    // Results count
    const countHtml = this.parent!.generateResultsCount(total);
    if (countHtml) {
      this.target!.insertAdjacentHTML('beforeend', countHtml);
    }

    // Item nodes for the loaded slice
    this.target!.appendChild(this.#renderItems(locations.slice(0, count)));

    // Controls
    const hasMore = count < total;
    if (hasMore || this.settings.showStatus) {
      this.target!.insertAdjacentHTML(
        'beforeend',
        this.#buildInfiniteControlsHtml(count, total, hasMore),
      );

      if (hasMore && (this.settings.infiniteMode === 'scroll' || this.settings.infiniteMode === 'both')) {
        const sentinel = this.target!.querySelector<HTMLElement>('[data-pagination-sentinel]');
        if (sentinel) this.#setupIntersectionObserver(sentinel);
      }
    }
  }

  /**
   * Builds a `<ul class="list locations-list-inner">` containing live `<li>` nodes.
   * Using DOM `appendChild` (not `innerHTML`) keeps nodes already in cache alive.
   */
  #renderItems(locations: LocationData[]): HTMLUListElement {
    const ul = document.createElement('ul');
    ul.className = 'list locations-list-inner';
    for (const location of locations) {
      ul.appendChild(this.#renderItem(location));
    }
    return ul;
  }

  /**
   * Returns a cached `<li>` node for the given location, or creates a new one.
   *
   * The first render sets `li.innerHTML` from `parent.generateLocationHTML()` (once).
   * On subsequent page changes the same node is reused — custom elements inside it
   * are never re-parsed, so their constructor / connectedCallback does not fire again.
   */
  #renderItem(location: LocationData): HTMLElement {
    const cached = this.#renderedCache.get(location.id);
    if (cached) return cached;

    const li = document.createElement('li');
    li.innerHTML = this.parent!.generateLocationHTML(location);
    this.#renderedCache.set(location.id, li);
    return li;
  }

  // ── Page range algorithm (MUI-style) ──────────────────────────────────────

  /**
   * Produces the sequence of page numbers (and `'...'` sentinels) to render.
   *
   * Algorithm:
   * 1. Always include `boundaryCount` pages at the start and end.
   * 2. Always include `siblingCount` pages on either side of `currentPage`.
   * 3. Merge into a sorted unique set and insert `'...'` wherever the gap between
   *    two consecutive shown values is greater than 1.
   */
  #buildPageRange(currentPage: number, totalPages: number): (number | '...')[] {
    const { siblingCount, boundaryCount } = this.settings;

    const clampedRange = (start: number, end: number): number[] => {
      const s = Math.max(1, start);
      const e = Math.min(totalPages, end);
      if (s > e) return [];
      return Array.from({ length: e - s + 1 }, (_, i) => i + s);
    };

    const startPages = clampedRange(1, boundaryCount);
    const endPages = clampedRange(totalPages - boundaryCount + 1, totalPages);
    const siblingPages = clampedRange(currentPage - siblingCount, currentPage + siblingCount);

    // Sorted unique union
    const allPages = [...new Set([...startPages, ...siblingPages, ...endPages])].sort((a, b) => a - b);

    const result: (number | '...')[] = [];
    for (let i = 0; i < allPages.length; i++) {
      if (i > 0 && allPages[i] > allPages[i - 1] + 1) {
        result.push('...');
      }
      result.push(allPages[i]);
    }
    return result;
  }

  // ── HTML builders ─────────────────────────────────────────────────────────

  #buildFullControlsHtml(currentPage: number, totalPages: number, total: number): string {
    const s = this.settings;
    const extraClasses = s.wrapperExtraClassesNumbered ? ` ${s.wrapperExtraClassesNumbered}` : '';

    const start = (currentPage - 1) * s.itemsPerPage + 1;
    const end = Math.min(currentPage * s.itemsPerPage, total);
    const statusHtml = s.showStatus ? this.#buildStatusHtml(start, end, total) : '';

    let items = '';

    if (s.showFirstLast) {
      const disabled = currentPage === 1;
      items +=
        `<${s.itemTag} class="${s.itemClass}${disabled ? ` ${s.disabledClass}` : ''}">` +
        `<${s.linkTag} class="${s.linkClass}"${disabled ? ` aria-disabled="true"` : ` data-page="1"`} aria-label="First page">` +
        `«</${s.linkTag}></${s.itemTag}>`;
    }

    if (s.showPrevNext) {
      const disabled = currentPage === 1;
      items +=
        `<${s.itemTag} class="${s.itemClass}${disabled ? ` ${s.disabledClass}` : ''}">` +
        `<${s.linkTag} class="${s.linkClass}"${disabled ? ` aria-disabled="true"` : ` data-page="${currentPage - 1}"`} aria-label="Previous page">` +
        `${s.prevText}</${s.linkTag}></${s.itemTag}>`;
    }

    for (const page of this.#buildPageRange(currentPage, totalPages)) {
      if (page === '...') {
        items +=
          `<${s.itemTag} class="${s.itemClass} pagination__ellipsis" aria-hidden="true">` +
          `<span>…</span></${s.itemTag}>`;
      } else if (page === currentPage) {
        items +=
          `<${s.itemTag} class="${s.itemClass} ${s.activeClass}" aria-current="page">` +
          `<${s.currentItemTag} class="${s.currentItemClass}">${page}</${s.currentItemTag}>` +
          `</${s.itemTag}>`;
      } else {
        items +=
          `<${s.itemTag} class="${s.itemClass}">` +
          `<${s.linkTag} class="${s.linkClass}" data-page="${page}" aria-label="Page ${page}">${page}</${s.linkTag}>` +
          `</${s.itemTag}>`;
      }
    }

    if (s.showPrevNext) {
      const disabled = currentPage === totalPages;
      items +=
        `<${s.itemTag} class="${s.itemClass}${disabled ? ` ${s.disabledClass}` : ''}">` +
        `<${s.linkTag} class="${s.linkClass}"${disabled ? ` aria-disabled="true"` : ` data-page="${currentPage + 1}"`} aria-label="Next page">` +
        `${s.nextText}</${s.linkTag}></${s.itemTag}>`;
    }

    if (s.showFirstLast) {
      const disabled = currentPage === totalPages;
      items +=
        `<${s.itemTag} class="${s.itemClass}${disabled ? ` ${s.disabledClass}` : ''}">` +
        `<${s.linkTag} class="${s.linkClass}"${disabled ? ` aria-disabled="true"` : ` data-page="${totalPages}"`} aria-label="Last page">` +
        `»</${s.linkTag}></${s.itemTag}>`;
    }

    return (
      `<${s.wrapperTag} class="${s.wrapperClass}${extraClasses}" data-pagination-controls>` +
      statusHtml +
      `<${s.navTag} class="${s.navClass}" role="navigation" aria-label="${s.navAriaLabel}">` +
      `<${s.listTag} class="${s.listClass}">${items}</${s.listTag}>` +
      `</${s.navTag}>` +
      `</${s.wrapperTag}>`
    );
  }

  #buildInfiniteControlsHtml(loadedCount: number, total: number, hasMore: boolean): string {
    const s = this.settings;
    const extraClasses = s.wrapperExtraClassesInfinite ? ` ${s.wrapperExtraClassesInfinite}` : '';
    const statusHtml = s.showStatus ? this.#buildStatusHtml(1, loadedCount, total) : '';

    let buttonHtml = '';
    if (hasMore) {
      if (s.infiniteMode === 'button' || s.infiniteMode === 'both') {
        buttonHtml += `<button type="button" class="${s.loadMoreButtonClass}" data-load-more>${s.loadMoreText}</button>`;
      }
      if (s.infiniteMode === 'scroll' || s.infiniteMode === 'both') {
        buttonHtml += `<div class="pagination-sentinel" data-pagination-sentinel aria-hidden="true"></div>`;
      }
    }

    return (
      `<${s.wrapperTag} class="${s.wrapperClass}${extraClasses}" data-pagination-controls>` +
      statusHtml +
      buttonHtml +
      `</${s.wrapperTag}>`
    );
  }

  #buildStatusHtml(start: number, end: number, total: number): string {
    const s = this.settings;
    const text = s.statusText
      .replace(/\[count\]/g, end.toString())
      .replace(/\[total\]/g, total.toString())
      .replace(/\[start\]/g, start.toString())
      .replace(/\[end\]/g, end.toString());

    return (
      `<${s.statusWrapperTag} class="${s.statusWrapperClass}">` +
      `<${s.statusItemTag}>${text}</${s.statusItemTag}>` +
      `</${s.statusWrapperTag}>`
    );
  }

  // ── Observer / listeners ──────────────────────────────────────────────────

  #setupIntersectionObserver(sentinel: HTMLElement): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.#disconnectObserver();
    this.#intersectionObserver = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          this.loadMore();
        }
      },
      { root: null, threshold: 0.1 },
    );
    this.#intersectionObserver.observe(sentinel);
  }

  #disconnectObserver(): void {
    if (this.#intersectionObserver) {
      this.#intersectionObserver.disconnect();
      this.#intersectionObserver = null;
    }
  }

  /**
   * Attaches a single delegated click listener on `target` that handles both
   * `[data-page]` (page navigation) and `[data-load-more]` (infinite load).
   */
  #attachClickListener(): void {
    this.#clickListener = (e: Event) => {
      const eventTarget = e.target as HTMLElement;

      const pageLink = eventTarget.closest<HTMLElement>('[data-page]');
      if (pageLink && this.target?.contains(pageLink)) {
        e.preventDefault();
        const page = parseInt(pageLink.dataset.page!, 10);
        if (!isNaN(page)) this.goToPage(page);
        return;
      }

      const loadMoreBtn = eventTarget.closest<HTMLElement>('[data-load-more]');
      if (loadMoreBtn && this.target?.contains(loadMoreBtn)) {
        e.preventDefault();
        this.loadMore();
      }
    };
    this.target!.addEventListener('click', this.#clickListener);
  }

  #removeClickListener(): void {
    if (this.#clickListener && this.target) {
      this.target.removeEventListener('click', this.#clickListener);
      this.#clickListener = null;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  #getTotalPages(total: number): number {
    return Math.max(1, Math.ceil(total / this.settings.itemsPerPage));
  }

  #getPageItems(locations: LocationData[]): LocationData[] {
    const { itemsPerPage } = this.settings;
    const start = (this.#currentPage - 1) * itemsPerPage;
    return locations.slice(start, start + itemsPerPage);
  }

  #dispatchPaginationEvent(type: string, detail: Record<string, unknown> = {}): void {
    this.target?.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        cancelable: true,
        detail: { ...detail, pagination: this },
      }),
    );
  }
}
