import { distance } from './utils/locations-utils';
import MapsWrapperInterface, {
  MapMarkerInterface,
} from './map-providers/MapsWrapperInterface';
import {
  SearchProvider,
  SearchResult,
  LocationContainerSettings,
  LocationData,
} from './interfaces';
import { Position } from './interfaces';
import autoComplete from '@tarekraafat/autocomplete.js';
import List from 'list.js';

import '@tarekraafat/autocomplete.js/dist/css/autoComplete.css';
// import './scss/app.scss';

/**
 * the class to handle the location map
 */
export default class LocationsMap {
  protected settings: LocationContainerSettings;
  protected displaySearch = true;

  protected geolocalized = false;
  protected latitude: number;
  protected longitude: number;
  protected zoom: number;

  locations: LocationData[] = [];
  filteredLocations: LocationData[] = [];
  filters = [];

  protected mapWrapper: MapsWrapperInterface;
  protected searchProvider: SearchProvider | null;
  autocomplete: any;
  protected paginationList: List;

  protected uiContainer: HTMLElement;
  protected locationList: HTMLElement;
  protected searchForm?: HTMLFormElement;
  protected searchInput?: HTMLInputElement;
  protected popupContainers?: HTMLElement[];

  selectedMarker?: MapMarkerInterface;
  hoveredLocation?: LocationData = null;

  constructor(element = null, extraSettings: LocationContainerSettings | {} = {}) {
    this.uiContainer = element || document.querySelector('locations-map-container');
    this.locationList = this.uiContainer.querySelector('locations-map-list');
    this.searchForm = this.uiContainer.querySelector('[data-location-search]');
    this.popupContainers = [
      ...this.uiContainer.querySelectorAll('locations-map-popup'),
    ] as HTMLElement[];
    this.searchInput = this.searchForm.querySelector(
      'input[type="search"]'
    ) as HTMLInputElement;

    this.settings = JSON.parse(
      this.uiContainer.dataset.settings
    ) as LocationContainerSettings;
    this.settings = { ...this.settings, ...extraSettings };
    const {
      latitude,
      longitude,
      zoom = 8,
      locations = [],
      displaySearch = true,
      filters = [],
      searchProvider = null,
      mapProvider = null,
    } = this.settings;

    this.latitude = latitude;
    this.longitude = longitude;
    this.displaySearch = displaySearch && !!this.searchProvider;
    this.searchProvider = searchProvider;
    this.zoom = zoom;
    this.filters = filters;
    this.mapWrapper = mapProvider;

    this.locations = this.parseLocations(locations);
    (this.uiContainer as any).locationsMap = this;

    this.init();
  }

  /**
   * parse the locations and fix their latitude/longitude
   */
  protected parseLocations(locations: LocationData[]): LocationData[] {
    locations = locations.map(location => {
      location = {
        ...location,
        latitude: parseFloat(location.latitude.toString()),
        longitude: parseFloat(location.longitude.toString()),
      };

      // try to fix when locations overlap
      const threshold = 0.00001;
      const overlappingLocation = location.latitude
        ? locations.find(
            item =>
              Math.abs(item.latitude - location.latitude) < threshold &&
              Math.abs(item.longitude - location.longitude) < threshold &&
              item.id < location.id
          )
        : false;
      if (overlappingLocation) {
        location.latitude +=
          threshold * (overlappingLocation.latitude > location.latitude ? -1 : 1);
        // console.log('fixing location overlap', location, overlappingLocation);
      }

      return location;
    });

    this.dispatchEvent('parseLocations', {
      detail: {
        locations,
      },
    });

    return locations;
  }

  /**
   * set the filters
   */
  setFilters(filters: string[]): this {
    this.applyFilters(filters);
    if (this.displaySearch) {
      this.updateLocationsListContent();
    }
    this.closePopups();
    return this;
  }

  /**
   * update the locations (maybe when setting favourites)
   */
  updateLocations(callback: (locations: LocationData[]) => LocationData[]): this {
    this.locations = callback(this.locations);
    this.updateContent(true);
    return this;
  }

  /**
   * close the location popups
   */
  closePopups(): this {
    this.selectedMarker = null;
    this.mapWrapper.closeMarkerTooltip();
    this.mapWrapper.unhighlightMarkers();
    this.popupContainers.forEach(container => {
      container.innerHTML = '';
    });
    if (this.locationList) {
      [...this.locationList.querySelectorAll('.location-wrapper.in-focus')].forEach(
        item => item.classList.remove('in-focus')
      );
    }
    return this;
  }

  /**
   * initialize the interface
   */
  protected init = async () => {
    await this.initMap();
    this.updateContent();
  };

  /**
   * update the HTML for the locations list
   */
  updateLocationsListContent = (): this => {
    if (!this.locationList) return this;

    let html = '';
    html += this.generateResultsCount(this.filteredLocations.length);
    html += '<ul class="list locations-list-inner">';
    this.filteredLocations.forEach(location => {
      html += `<li>${this.generateLocationHTML(location)}</li>`;
    });
    html += '</ul>';
    html += '<ul class="pagination"></ul>';
    this.locationList.innerHTML = html;
    this.locationList.id = 'locations-list';

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
    if (this.filteredLocations.length > settings.page) {
      this.paginationList = new List(this.locationList, settings);
    }

    this.dispatchEvent('updatedLocationListContent');
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
    this.dispatchEvent('updatedLocationListContent', { detail });
    return detail.html;
  };

  /**
   * replace placeholders with location data inside html templates
   */
  protected replaceHTMLPlaceholders = (html: string, location: LocationData): string => {
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
   * generate the HTML for a location in the locations list
   */
  protected generateLocationHTML = (location: LocationData): string => {
    // find the template
    const defaultSelector = `template.template-location:not([data-location-type])`;
    const selector = location.type
      ? `template.template-location[data-location-type="${location.type}"]`
      : defaultSelector;
    const template =
      document.querySelector(selector) || document.querySelector(defaultSelector);

    // replace placeholders
    if (template) {
      const innerHtml = this.replaceHTMLPlaceholders(template.innerHTML, location);
      const isSelected =
        this.selectedMarker && this.selectedMarker.location.id == location.id;
      const html = `<div class="location-wrapper location-item-wrapper${
        isSelected ? ' in-focus' : ''
      }" data-property="${location.id}" data-type="${location.type}">${innerHtml}</div>`;
      const detail = { html, innerHtml, isSelected, location };
      this.dispatchEvent('generateLocationHTML', { detail });
      return detail.html;
    }

    console.error(`template with selector "${selector}" not found`);
    return '';
  };

  /**
   * generate the HTML for a location popup
   */
  protected generateLocationPopupHTML = (location: LocationData): string => {
    // find the template
    const defaultSelector = `template.template-popup-location:not([data-location-type])`;
    const selector = location.type
      ? `template.template-popup-location[data-location-type="${location.type}"]`
      : defaultSelector;
    const template =
      document.querySelector(selector) || document.querySelector(defaultSelector);

    // replace placeholders
    if (template) {
      const innerHtml = this.replaceHTMLPlaceholders(template.innerHTML, location);
      const html = `<div class="location-wrapper location-popup-wrapper" data-property="${location.id}" data-type="${location.type}">${innerHtml}</div>`;
      const detail = { html, innerHtml, location };
      this.dispatchEvent('generateLocationPopupHTML', { detail });
      return detail.html;
    }

    console.error(`template with selector "${selector}" not found`);
    return '';
  };

  /**
   * update the locations info (distance) after the GPS location is updated
   */
  updateLocationsDistanceAndStatus = (): void => {
    this.locations = this.locations
      .map(location => {
        return {
          ...location,
          distance: distance(
            location.latitude,
            location.longitude,
            this.latitude,
            this.longitude,
            'K'
          ),
        };
      })
      .sort((a, b) => a.distance - b.distance);

    this.dispatchEvent('updatedLocations', {
      detail: {
        locations: this.locations,
      },
    });
  };

  protected applyFilters = (filters: string[] = null): this => {
    if (filters !== null) {
      this.filters = filters;
    }
    this.filteredLocations = this.locations.filter(location => {
      return !this.filters.length || this.filters.includes(location.type);
    });
    this.mapWrapper?.filterMarkers(marker => {
      return !!this.filteredLocations.find(
        location => marker.location?.id == location.id
      );
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

    this.updateLocationsDistanceAndStatus();
    this.applyFilters();
    this.updateLocationsListContent();

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
      new CustomEvent(`${type}.locationsMap`, {
        bubbles: true,
        cancelable: true,
        ...options,
        detail: {
          ...(options.detail || {}),
          locationsMap: this,
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

    this.mapWrapper.setParent(this);

    const mapTarget = this.uiContainer.querySelector('locations-map-target');
    mapTarget.id = mapTarget.id || 'locations-map-target';

    await this.mapWrapper.initializeMap(mapTarget.id, {
      latitude: this.latitude,
      longitude: this.longitude,
      zoom: this.zoom,
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
    const markers = this.locations.map(location => {
      return {
        latitude: location.latitude as number,
        longitude: location.longitude as number,
        location,
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

    if (this.locationList) {
      // pan to location when clicking on the list
      this.locationList.addEventListener('click', this.onListedLocationClick);

      // pan to location when hovering on a location
      this.locationList.addEventListener('mouseenter', this.onListedLocationHover, true);
      this.locationList.addEventListener(
        'mouseleave',
        this.onListedLocationHoverOut,
        true
      );
    }

    // listen to marker clicks
    this.mapWrapper.addMarkerClickCallback(this.onMarkerClick);

    // listen to popup closing
    this.uiContainer.addEventListener('closedPopup.locationsMap', () => {
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
    if (this.locationList) {
      // deselect other focused locations
      [...this.locationList.querySelectorAll(`.location-wrapper.in-focus`)].forEach(
        item => item.classList.remove('in-focus')
      );

      // select the new one
      this.locationList
        .querySelector(`.location-wrapper[data-property="${marker.location.id}"]`)
        ?.classList.add('in-focus');
    }

    // make sure we have the updated distance values
    const location = this.locations.find(location => location.id == marker.location.id);
    const popupHtml = this.generateLocationPopupHTML(location);
    const detail = {
      marker,
      location,
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
   * handle clicks on the listed locations
   */
  protected onListedLocationClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const locationEl = target.closest('.location-wrapper') as HTMLElement;
    if (!locationEl || target.closest('a')) return;

    const locationId = locationEl.dataset.property;
    const location = this.locations.find(location => location.id == locationId);
    let allowed = true;
    if (location) {
      allowed = this.dispatchEvent('listClick', {
        detail: {
          originalEvent: e,
          locationId,
          location,
          mapWrapper: this.mapWrapper,
        },
      });
      if (allowed) {
        if (this.settings.focusOnClick ?? true) {
          this.focusOnLocation(location);
        }
      }
    }

    if (allowed) {
      this.closePopups();
    }
  };

  /**
   * focus on a location when hovering on it
   */
  protected onListedLocationHover = (e: MouseEvent) => {
    if (!this.settings.focusOnHover) {
      return;
    }
    const target = e.target as HTMLElement;
    const locationEl = target.closest('.location-wrapper') as HTMLElement;
    if (!locationEl || target.closest('a')) return;

    const locationId = locationEl.dataset.property;
    const location = this.locations.find(location => location.id == locationId);
    let allowed = true;
    if (location) {
      // don't trigger twice
      if (this.hoveredLocation && this.hoveredLocation.id == location.id) {
        return;
      }

      allowed = this.dispatchEvent('listHover', {
        detail: {
          originalEvent: e,
          locationId,
          location,
          mapWrapper: this.mapWrapper,
        },
      });
      if (allowed) {
        this.hoveredLocation = location;
        setTimeout(() => {
          if (this.hoveredLocation && this.hoveredLocation.id == location.id) {
            this.focusOnLocation(location);
          }
        }, this.settings.focusOnHoverTimeout || 1000);
      }
    }
  };

  /**
   * hover out of a location
   */
  protected onListedLocationHoverOut = (e: MouseEvent) => {
    if (!this.hoveredLocation) return;

    const target = e.target as HTMLElement;
    const locationEl = target.closest('.location-wrapper') as HTMLElement;
    if (!locationEl || target.closest('a')) return;

    const locationId = locationEl.dataset.property;
    const location = this.locations.find(location => location.id == locationId);
    if (location) {
      if (this.hoveredLocation && this.hoveredLocation.id == location.id) {
        this.hoveredLocation = null;
      }
    }
  };

  /**
   * focus on a specific location
   * @param location
   */
  focusOnLocation = (location: LocationData): this => {
    this.mapWrapper.panTo(location);
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
    const zipcodeRegex = /^(([0-8][0-9])|(9[0-5])|(2[ab]))[0-9]{3}$/;

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
   * scroll to a specific location
   */
  scrollTo = (location: HTMLElement = null): this => {
    location = location || this.uiContainer.querySelector('.location-wrapper');
    location.scrollIntoView();
    return this;
  };
}
