import { distance } from './utils';
import GoogleMapsWrapper from './GoogleMapsWrapper';
import MapsWrapperInterface, { MapMarkerInterface } from './MapsWrapperInterface';
import {
  SearchProvider,
  SearchResult,
  StoreContainerSettings,
  StoreData,
} from './interfaces';
import LeafletMapWrapper from './LeafletMapWrapper';
import { NominatimProvider } from './search/NominatimProvider';
import { GoogleMapsGeocoderProvider } from './search/GoogleMapsGeocoderProvider';
import { Position } from './interfaces';
import '@tarekraafat/autocomplete.js/dist/css/autoComplete.css';
import autoComplete from '@tarekraafat/autocomplete.js';
import List from 'list.js';

/**
 * the class to handle the store map
 */
export default class StoresMap {
  protected settings: StoreContainerSettings;
  protected displaySearch = true;

  protected geolocalized = false;
  protected latitude: number;
  protected longitude: number;
  protected zoom: number;

  stores: StoreData[] = [];
  filteredStores: StoreData[] = [];
  filters = [];

  protected mapWrapper: MapsWrapperInterface;
  protected searchProvider: SearchProvider;
  autocomplete: any;
  protected paginationList: List;

  protected uiContainer: HTMLElement;
  protected storeList: HTMLElement;
  protected searchForm?: HTMLFormElement;
  protected searchInput?: HTMLInputElement;
  protected popupContainers?: HTMLElement[];

  selectedMarker?: MapMarkerInterface;
  hoveredStore?: StoreData = null;

  constructor(element = null, extraSettings: StoreContainerSettings | {} = {}) {
    this.uiContainer = element || document.querySelector('stores-map-container');
    this.storeList = this.uiContainer.querySelector('stores-map-list');
    this.searchForm = this.uiContainer.querySelector('[data-store-search]');
    this.popupContainers = [
      ...this.uiContainer.querySelectorAll('stores-map-popup'),
    ] as HTMLElement[];
    this.searchInput = this.searchForm.querySelector(
      'input[type="search"]'
    ) as HTMLInputElement;

    this.settings = JSON.parse(
      this.uiContainer.dataset.settings
    ) as StoreContainerSettings;
    this.settings = { ...this.settings, ...extraSettings };
    const {
      latitude,
      longitude,
      zoom = 8,
      stores = [],
      displaySearch = true,
      filters = [],
    } = this.settings;

    this.latitude = latitude;
    this.longitude = longitude;
    this.displaySearch = displaySearch;
    this.zoom = zoom;
    this.filters = filters;

    this.stores = this.parseStores(stores);
    (this.uiContainer as any).storesMap = this;

    this.init();
  }

  /**
   * parse the stores and fix their latitude/longitude
   */
  protected parseStores(stores: StoreData[]): StoreData[] {
    stores = stores.map(store => {
      store = {
        ...store,
        hours: store.hours ? JSON.parse(store.hours.toString()) : [],
        latitude: parseFloat(store.latitude.toString()),
        longitude: parseFloat(store.longitude.toString()),
      };

      // try to fix when stores overlap
      const threshold = 0.00001;
      const overlappingStore = store.latitude
        ? stores.find(
            item =>
              Math.abs(item.latitude - store.latitude) < threshold &&
              Math.abs(item.longitude - store.longitude) < threshold &&
              item.id < store.id
          )
        : false;
      if (overlappingStore) {
        store.latitude +=
          threshold * (overlappingStore.latitude > store.latitude ? -1 : 1);
        console.log('fixing store overlap', store, overlappingStore);
      }

      return store;
    });

    return stores;
  }

  /**
   * set the filters
   */
  setFilters(filters: string[]): this {
    this.applyFilters(filters);
    if (this.displaySearch) {
      this.updateStoresListContent();
    }
    this.closePopups();
    return this;
  }

  /**
   * update the stores (maybe when setting favourites)
   */
  updateStores(callback: (stores: StoreData[]) => StoreData[]): this {
    this.stores = callback(this.stores);
    this.updateContent(true);
    return this;
  }

  /**
   * close the store popups
   */
  closePopups(): this {
    this.selectedMarker = null;
    this.mapWrapper.closeMarkerTooltip();
    this.mapWrapper.unhighlightMarkers();
    this.popupContainers.forEach(container => {
      container.innerHTML = '';
    });
    [...this.storeList.querySelectorAll('.store-wrapper.in-focus')].forEach(item =>
      item.classList.remove('in-focus')
    );
    return this;
  }

  /**
   * initialize the interface
   */
  protected init = async () => {
    await this.initMap();
    this.updateContent();

    if (this.displaySearch) {
      this.searchProvider = this.settings.useGoogleMapsGeocoder
        ? new GoogleMapsGeocoderProvider()
        : new NominatimProvider();
    }
  };

  /**
   * update the HTML for the stores list
   */
  updateStoresListContent = (): this => {
    let html = '';
    html += this.generateResultsCount(this.filteredStores.length);
    html += '<ul class="list stores-list-inner">';
    this.filteredStores.forEach(store => {
      html += `<li>${this.generateStoreHTML(store)}</li>`;
    });
    html += '</ul>';
    html += '<ul class="pagination"></ul>';
    this.storeList.innerHTML = html;
    this.storeList.id = 'stores-list';

    // initialize the pagination
    const paginationSettings = this.settings.paginationSettings || {};
    const settings: List.ListOptions = {
      page: paginationSettings.page || 5,
      pagination: {
        paginationClass: 'pagination',
        item: "<li><a class='page'></a></li>",
        outerWindow: 1,
        ...(paginationSettings.pagination || {}),
      },
      ...paginationSettings,
    };
    if (this.paginationList) {
      this.paginationList.clear();
    }
    if (this.filteredStores.length > settings.page) {
      this.paginationList = new List(this.storeList, settings);
    }

    this.dispatchEvent('updatedStoreListContent');
    return this;
  };

  /**
   * generate the html for the results count, based on a template in the markup
   */
  protected generateResultsCount = (count: number): string => {
    let html = '';
    const template = document.querySelector(
      `template.template-results-${count > 1 ? 'multiple' : 'single'}`
    );
    if (template) {
      html = template.innerHTML.replace('{{ results }}', count.toString());
    }
    const detail = { html, count, template };
    this.dispatchEvent('updatedStoreListContent', { detail });
    return detail.html;
  };

  /**
   * replace placeholders with store data inside html templates
   */
  protected replaceHTMLPlaceholders = (html: string, location: StoreData): string => {
    for (let key in location) {
      let value = location[key];
      if (key == 'distance') {
        value =
          value > 20
            ? Math.round(value)
            : Math.round((location[key] + Number.EPSILON) * 10) / 10;
        value = value.toLocaleString(document.documentElement.lang);
      }
      html = html
        .replaceAll(`{{ ${key} }}`, (value || '').toString())
        .replaceAll(`{{${key}}}`, (value || '').toString());
    }

    const detail = { html, location };
    this.dispatchEvent('replaceHTMLPlaceholders', { detail });
    return detail.html;
  };

  /**
   * generate the HTML for a store in the stores list
   */
  protected generateStoreHTML = (location: StoreData): string => {
    // find the template
    const defaultSelector = `template.template-store:not([data-store-type])`;
    const selector = location.type
      ? `template.template-store[data-store-type="${location.type}"]`
      : defaultSelector;
    const template =
      document.querySelector(selector) || document.querySelector(defaultSelector);

    // replace placeholders
    if (template) {
      const innerHtml = this.replaceHTMLPlaceholders(template.innerHTML, location);
      const isSelected =
        this.selectedMarker && this.selectedMarker.store.id == location.id;
      const html = `<div class="store-wrapper store-item-wrapper${
        isSelected ? ' in-focus' : ''
      }" data-property="${location.id}" data-type="${location.type}">${innerHtml}</div>`;
      const detail = { html, innerHtml, isSelected, location };
      this.dispatchEvent('generateStoreHTML', { detail });
      return detail.html;
    }

    return `template with selector "${selector}" not found`;
  };

  /**
   * generate the HTML for a store popup
   */
  protected generateStorePopupHTML = (location: StoreData): string => {
    // find the template
    const defaultSelector = `template.template-popup-store:not([data-store-type])`;
    const selector = location.type
      ? `template.template-popup-store[data-store-type="${location.type}"]`
      : defaultSelector;
    const template =
      document.querySelector(selector) || document.querySelector(defaultSelector);

    // replace placeholders
    if (template) {
      const innerHtml = this.replaceHTMLPlaceholders(template.innerHTML, location);
      const html = `<div class="store-wrapper store-popup-wrapper" data-property="${location.id}" data-type="${location.type}">${innerHtml}</div>`;
      const detail = { html, innerHtml, location };
      this.dispatchEvent('generateStorePopupHTML', { detail });
      return detail.html;
    }

    return `template with selector "${selector}" not found`;
  };

  /**
   * update the stores info (distance) after the GPS location is updated
   */
  updateStoresDistanceAndStatus = (): void => {
    this.stores = this.stores
      .map(store => {
        return {
          ...store,
          distance: distance(
            store.latitude,
            store.longitude,
            this.latitude,
            this.longitude,
            'K'
          ),
        };
      })
      .sort((a, b) => a.distance - b.distance);

    this.dispatchEvent('updatedStores', {
      detail: {
        stores: this.stores,
      },
    });
  };

  protected applyFilters = (filters: string[] = null): this => {
    if (filters !== null) {
      this.filters = filters;
    }
    this.filteredStores = this.stores.filter(store => {
      return !this.filters.length || this.filters.includes(store.type);
    });
    this.mapWrapper?.filterMarkers(marker => {
      return !!this.filteredStores.find(store => marker.store?.id == store.id);
    });
    this.dispatchEvent('appliedFilters', {
      detail: {
        filters,
      },
    });
    return this;
  };

  /**
   * update all the content (distances, popups)
   *
   * @param keepPopupsOpen whether to keep the existing map popups open
   */
  updateContent = (keepPopupsOpen: boolean = true): this => {
    this.dispatchEvent('updatingContent', { detail: { keepPopupsOpen } });

    this.updateStoresDistanceAndStatus();
    this.applyFilters();
    if (this.displaySearch) {
      this.updateStoresListContent();
    }

    if (keepPopupsOpen) {
      if (this.selectedMarker) {
        // regenerate the popup content
        this.onMarkerClick(this.selectedMarker);
      }
    } else {
      this.closePopups();
    }

    this.dispatchEvent('updatedContent', { detail: { keepPopupsOpen } });
    return this;
  };

  dispatchEvent = (
    type: string,
    options: CustomEventInit<Record<any, unknown>> = {},
    element: HTMLElement = null
  ): boolean => {
    return (element || this.uiContainer).dispatchEvent(
      new CustomEvent(`${type}.storesMap`, {
        bubbles: true,
        cancelable: true,
        ...options,
        detail: {
          ...(options.detail || {}),
          storesMap: this,
        },
      })
    );
  };

  /**
   * initialize the map
   */
  protected initMap = async () => {
    this.dispatchEvent('initializing', {
      detail: {
        settings: this.settings,
      },
    });

    if (this.settings.useGoogleMaps) {
      this.mapWrapper = new GoogleMapsWrapper(this);
    } else {
      this.mapWrapper = new LeafletMapWrapper(this);
    }

    const mapTarget = this.uiContainer.querySelector('stores-map-target');
    mapTarget.id = mapTarget.id || 'stores-map-target';

    await this.mapWrapper.initializeMap(mapTarget.id, {
      latitude: this.latitude,
      longitude: this.longitude,
      zoom: this.zoom,
      clusters: this.settings.clusters,
      clusterSettings: this.settings.clusterSettings,
      apiKey: this.settings.apiKey,
      googleMapsSettings: this.settings.googleMapsSettings || {},
      icon: this.settings.icon,
    });

    // create the map markers
    this.createMapMarkers();

    // the search form + autocomplete
    this.initSearchForm();

    // trigger geolocation
    if (navigator.geolocation) {
      setTimeout(() => {
        navigator.geolocation.getCurrentPosition(position =>
          this.setMapPosition(position, true)
        );
      }, 2500);
    }

    this.addListeners();

    this.dispatchEvent('initialized', {
      detail: {
        settings: this.settings,
      },
    });
  };

  /**
   * create the map markers and the clusterer
   */
  protected createMapMarkers = () => {
    const markers = this.stores.map(store => {
      return {
        latitude: store.latitude as number,
        longitude: store.longitude as number,
        store,
      };
    });
    return this.mapWrapper.addMapMarkers(markers);
  };

  /**
   * initialize the search form + autocomplete functionality
   */
  protected initSearchForm = async () => {
    if (!this.searchForm) return;

    this.searchForm.addEventListener('submit', e => {
      if (this.dispatchEvent('search')) {
        e.stopPropagation();
        e.preventDefault();
        this.doSearch();
      }
    });

    if (this.settings.autocomplete && this.searchInput) {
      this.searchInput.autocomplete = 'off';
      this.autocomplete = new autoComplete({
        data: {
          src: this.getAutocompleteResults,
          key: ['title'],
          cache: false,
        },
        trigger: {
          event: ['input', 'submit'],
        },
        selector: () => this.searchInput,
        threshold: 3,
        debounce: 300,
        diacritics: true,
        searchEngine: () => true,
        highlight: false,
        maxResults: 10,
        resultsList: {
          render: true,
        },
        resultItem: {
          content: (data, source) => {
            source.innerHTML = `${data.value.title}`;
          },
          element: 'li',
        },
        onSelection: ({ selection: { value: selected } }) => {
          this.updateFromSearch(selected.result);
        },
      });
    }
  };

  /**
   * add some event listeners
   */
  protected addListeners = () => {
    // geolocate
    const geolocationTriggers = this.uiContainer.querySelectorAll(
      '[data-geolocate-trigger]'
    );
    [...geolocationTriggers].forEach(button =>
      button.addEventListener('click', this.geolocate)
    );

    // pan to store when clicking on the list
    this.storeList.addEventListener('click', this.onListedStoreClick);

    // pan to store when hovering on a store
    this.storeList.addEventListener('mouseenter', this.onListedStoreHover, true);
    this.storeList.addEventListener('mouseleave', this.onListedStoreHoverOut, true);

    // listen to marker clicks
    this.mapWrapper.addMarkerClickCallback(this.onMarkerClick);

    // listen to popup closing
    this.uiContainer.addEventListener('closedPopup.storesMap', () => {
      this.closePopups();
    });

    // listen to "close-popup" click
    this.uiContainer.addEventListener('click', e => {
      const closeButton = (e.target as HTMLElement).closest('[data-close-popup]');
      if (closeButton) {
        e.preventDefault();
        this.closePopups();
      }
    });

    return this;
  };

  /**
   * handle marker clicks
   */
  protected onMarkerClick = (marker: MapMarkerInterface) => {
    // deselect other focused stores
    [...this.storeList.querySelectorAll(`.store-wrapper.in-focus`)].forEach(item =>
      item.classList.remove('in-focus')
    );

    // select the new one
    this.storeList
      .querySelector(`.store-wrapper[data-property="${marker.store.id}"]`)
      ?.classList.add('in-focus');

    // make sure we have the updated distance values
    const store = this.stores.find(store => store.id == marker.store.id);
    const popupHtml = this.generateStorePopupHTML(store);
    const detail = {
      marker,
      store,
      popupHtml,
    };
    if (this.dispatchEvent('showPopup', { detail })) {
      this.selectedMarker = marker;
      // change the map marker icon
      this.mapWrapper.unhighlightMarkers();
      this.mapWrapper.highlightMapMarker(marker);

      // display popups in a container outside the map
      if (this.dispatchEvent('showPopupOutsideMap', { detail })) {
        this.popupContainers.forEach(container => {
          container.innerHTML = popupHtml;
        });
      }

      // display popups on the map
      if (
        this.dispatchEvent('showPopupOnMap', {
          detail,
        })
      ) {
        this.mapWrapper.displayMarkerTooltip(marker, popupHtml);
      }
    }
  };

  /**
   * handle clicks on the listed stores
   */
  protected onListedStoreClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const storeEl = target.closest('.store-wrapper') as HTMLElement;
    if (!storeEl || target.closest('a')) return;

    const storeId = storeEl.dataset.property;
    const store = this.stores.find(store => store.id == storeId);
    let allowed = true;
    if (store) {
      allowed = this.dispatchEvent('listClick', {
        detail: {
          originalEvent: e,
          storeId,
          store,
          mapWrapper: this.mapWrapper,
        },
      });
      if (allowed) {
        if (this.settings.focusOnClick ?? true) {
          this.focusOnStore(store);
        }
      }
    }

    if (allowed) {
      this.closePopups();
    }
  };

  /**
   * focus on a store when hovering on it
   */
  protected onListedStoreHover = (e: MouseEvent) => {
    if (!this.settings.focusOnHover) {
      return;
    }
    const target = e.target as HTMLElement;
    const storeEl = target.closest('.store-wrapper') as HTMLElement;
    if (!storeEl || target.closest('a')) return;

    const storeId = storeEl.dataset.property;
    const store = this.stores.find(store => store.id == storeId);
    let allowed = true;
    if (store) {
      // don't trigger twice
      if (this.hoveredStore && this.hoveredStore.id == store.id) {
        return;
      }

      allowed = this.dispatchEvent('listHover', {
        detail: {
          originalEvent: e,
          storeId,
          store,
          mapWrapper: this.mapWrapper,
        },
      });
      if (allowed) {
        this.hoveredStore = store;
        setTimeout(() => {
          if (this.hoveredStore && this.hoveredStore.id == store.id) {
            this.focusOnStore(store);
          }
        }, this.settings.focusOnHoverTimeout || 1000);
      }
    }
  };

  /**
   * hover out of a store
   */
  protected onListedStoreHoverOut = (e: MouseEvent) => {
    if (!this.hoveredStore) return;

    const target = e.target as HTMLElement;
    const storeEl = target.closest('.store-wrapper') as HTMLElement;
    if (!storeEl || target.closest('a')) return;

    const storeId = storeEl.dataset.property;
    const store = this.stores.find(store => store.id == storeId);
    if (store) {
      if (this.hoveredStore && this.hoveredStore.id == store.id) {
        this.hoveredStore = null;
      }
    }
  };

  /**
   * focus on a specific store
   * @param store
   */
  focusOnStore = (store: StoreData): this => {
    this.mapWrapper.panTo(store);
    const zoom = this.settings.focusedZoom || 17;
    setTimeout(() => this.mapWrapper.setZoom(zoom), 300);
    return this;
  };

  /**
   * set the map position
   * @param position
   * @param firstTime
   */
  setMapPosition = (
    position: Position | GeolocationPosition,
    firstTime: boolean = false
  ): this => {
    this.latitude = position.coords.latitude;
    this.longitude = position.coords.longitude;
    this.geolocalized = true;
    if (!firstTime || this.settings.scrollToGeolocation) {
      this.mapWrapper.panTo({
        latitude: this.latitude,
        longitude: this.longitude,
      });
    }
    this.updateContent();
    this.dispatchEvent('updatedMapPosition', { detail: { position, firstTime } });
    return this;
  };

  /**
   * trigger geolocation
   */
  geolocate = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            this.setMapPosition(position);
            resolve(position);
          },
          error => {
            alert(error.message);
            console.error(error);
            reject(error);
          }
        );
      } else {
        reject('Not available');
        alert('Geolocation not available');
      }
    });
  };

  /**
   * get the autocomplete search results for addresses
   */
  getSearchResults = async (searchValue: string) => {
    const zipcodeRegex = '^(([0-8][0-9])|(9[0-5])|(2[ab]))[0-9]{3}$';

    let searchPromise: Promise<SearchResult[]>;
    if (searchValue.match(zipcodeRegex)) {
      searchPromise = this.searchProvider.searchZip(searchValue);
    } else {
      searchPromise = this.searchProvider.search(searchValue);
    }

    return await searchPromise;
  };

  /**
   * update the current position and distances based on the selected location
   * @param result the selected search result
   * @returns this
   */
  protected updateFromSearch = (result: SearchResult): this => {
    if (!this.dispatchEvent('updatingFromSearch', { detail: { result } })) {
      return;
    }

    this.latitude = result.latitude;
    this.longitude = result.longitude;
    this.setMapPosition({
      coords: result,
    });

    this.mapWrapper.panTo({
      latitude: this.latitude,
      longitude: this.longitude,
    });
    this.mapWrapper.setZoom(this.settings.focusedAreaZoom || 10);
    this.updateContent();

    this.dispatchEvent('updatedFromSearch', { detail: { result } });
    return this;
  };

  /**
   * execute the search and update the current GPS location
   */
  doSearch = async () => {
    const searchValue = this.searchInput ? this.searchInput.value : '';

    if (!searchValue.trim().length && this.geolocalized) {
      this.mapWrapper.panTo({
        latitude: this.latitude,
        longitude: this.longitude,
      });
      setTimeout(() => this.mapWrapper.setZoom(6), 600);
      this.geolocalized = false;

      this.updateContent();
    } else {
      const results = await this.getSearchResults(searchValue);
      if (results.length) {
        this.updateFromSearch(results[0]);
      }
    }
  };

  /**
   * get the results for the autocomplete dropdown
   */
  protected getAutocompleteResults = async () => {
    await this.getSearchResults(this.searchInput.value);
    return this.searchProvider.getAutocompleteData();
  };

  /**
   * scroll to a specific store
   */
  scrollTo = (store: HTMLElement = null): this => {
    store = store || this.uiContainer.querySelector('.store-wrapper');
    store.scrollIntoView();
    return this;
  };
}
