# Locations Map

This library allows developers to create a map with store locations and apply filters, geolocate or search locations.

## How to install

Install using `npm` or `yarn`

```npm2yarn
npm install --save @smartimpact-it/locations-map
```

## How to use

Inside your HTML, create a structure similar to this:

```html
<locations-map-container>
  <locations-map-header class="text-center">
    <div class="search-container">
      <form class="search-form" type="GET" action="#" data-location-search>
        <div class="search-wrapper">
          <div class="search-icon">Search</div>

          <input
            name="search_location"
            id="searchvalue"
            type="search"
            placeholder="Search"
          />
          <button type="reset" class="button-close">&times;</button>
          <button type="submit" class="button-search">Search</button>
        </div>
      </form>

      <button type="button" class="button-geolocate" data-geolocate-trigger>
        <span>Geolocate</span>
      </button>
    </div>
  </locations-map-header>

  <locations-map-popup>
    <!-- location popup will be added here by JS -->
  </locations-map-popup>

  <locations-map-list>
    <!-- locations will be added here by JS -->
  </locations-map-list>

  <locations-map-target>
    <!-- The map will be added here by JS -->
  </locations-map-target>

  <template class="template-results-single">
    <div class="results-count">{{ results }} result</div>
  </template>

  <template class="template-results-multiple">
    <div class="results-count">{{ results }} results</div>
  </template>

  <!-- this is the default location template -->
  <template class="template-location">
    <div class="location">
      <div class="location-info">
        <h3 class="location-title">{{ name }}</h3>
        <div class="address">
          {{ address1 }} <br />
          {{ postcode }} {{ city }}
        </div>
        <div class="phone-number">
          <a href="tel:{{ phone }}"> {{ phone }} </a>
        </div>
      </div>
    </div>
  </template>

  <!-- popup templates -->
  <template class="template-popup-location">
    <div class="location in-popup">
      <div class="location">
        <button class="close-popup" data-close-popup>&times;</button>
        <div class="location-info">
          <h3 class="location-title">{{ name }}</h3>
          <div class="address">
            {{ address1 }} <br />
            {{ postcode }} {{ city }}
          </div>
          <div class="phone-number">
            <a href="tel:{{ phone }}"> {{ phone }} </a>
          </div>
        </div>
      </div>
    </div>
  </template>
</locations-map-container>
```

The placeholders above (`{{ postcode }}`, `{{ name }}` etc) will be replaced by the JavaScript library using the data from the stores/locations. These are keys that should also be present on the location objects.

For example, your locations array could look like this (the `id`, `longitude` and `latitude` fields are mandatory; also `type` (string) or `filterTypes` (string[]) if you want to use filtering):

```javascript
const locations = [
  {
    id: 1,
    name: 'First location',
    address1: 'Paris',
    postcode: '12345',
    city: 'Nantes',
    longitude: 44.2,
    latitude: 40.2,
    filterTypes: ['location', 'forest'],
  },
  {
    id: 2,
    name: 'Second location',
    address1: 'Paris',
    postcode: '12345',
    city: 'Nantes',
    longitude: 44.2,
    latitude: 40.2,
    filterTypes: ['location'],
  },
];
```

Import the library in your Javascript files.

### Google Maps with Google Geocoder

You have 2 types of Google maps providers: with and without clusters:

- `GoogleMapsClusteredWrapper`
- `GoogleMapsWrapper`

```javascript
import LocationsMap, {
  GoogleMapsClusteredWrapper,
  GoogleMapsGeocoderProvider,
} from '@smartimpact-it/locations-map';

const container = document.querySelector('locations-map-container');
if (container) {
  const mapProvider = new GoogleMapsClusteredWrapper({
    apiSettings: {
      apiKey: 'api-key-here',
    },
    mapSettings: {
      disableDefaultUI: false,
      // styles, // array with the styles to apply on the map...
    },
    clusterSettings: {
      styles: [
        {
          width: 30,
          height: 30,
          className: 'custom-clustericon-1',
        },
      ],
      clusterClass: 'custom-clustericon',
    }, // settings for the clusterer
  });

  const searchProvider = new GoogleMapsGeocoderProvider();

  const locationsMapSettings = {
    latitude: 44.1,
    longitude: 10.3,
    zoom: 8,
    locations,
    displaySearch: true,
    filters: [],
    searchProvider,
    mapProvider,
  };

  const locationsMap = new LocationsMap(container, locationsMapSettings);
}
```

### Leaflet with Nominatim Geocoder

You have 2 types of Leaflet maps: with and without clusters:

- `LeafletMapClusteredWrapper`
- `LeafletMapWrapper`

```javascript
import LocationsMap, {
  LeafletMapClusteredWrapper,
  NominatimProvider,
} from '@smartimpact-it/locations-map';

const container = document.querySelector('locations-map-container');
if (container) {
  const mapProvider = new LeafletMapClusteredWrapper();
  const searchProvider = new NominatimProvider();

  const locationsMapSettings = {
    searchProvider,
    mapProvider,
    latitude: 44.1,
    longitude: 10.3,
    zoom: 8,
    locations,
    displaySearch: true,
    filters: [],
    focusedZoom: 17,
    paginationSettings: {
      page: 4,
    },
    focusOnHover: false,
  };

  const locationsMap = new LocationsMap(container, locationsMapSettings);
}
```

## Settings for the Locations Map class

| Setting                     | Default value | Description                                                                                                                        |
| --------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `latitude`                  |               | the position on the map which will be displayed when first loaded                                                                  |
| `longitude`                 |               | the position on the map which will be displayed when first loaded                                                                  |
| `mapProvider`               |               | the map provider (an instance of the map providers)                                                                                |
| `searchProvider`            |               | the search provider (if search is to be used)                                                                                      |
| `autocomplete`              | `false`       | whether to use autocomplete on search. Allowed values: `false` / `true` or a callback to allow you to setup your own autocomplete. |
| `autocompleteExtraSettings` | `{}`          | extra settings for the `autoComplete.js` instance.                                                                                 |
| `zoom`                      | `8`           | initial zoom value                                                                                                                 |
| `focusedZoom`               | `17`          | the zoom value when a location is focused                                                                                          |
| `geolocateOnStart`          | `true`        | Try to geolocate the current user when the map is displayed                                                                        |
| `scrollToGeolocation`       | `false`       | Scroll to the geolocated position when we apply geolocation                                                                        |
| `focusOnHover`              | `false`       | Scroll to the hovered store on the map when hovering on the store in the list                                                      |
| `paginationSettings`        | see below     | settings for the [`List.js`](https://listjs.com/) instance used for the stores list. Set to `false`/`null` to disable pagination.  |
| `filters`                   | `[]`          | The initial set of active filters                                                                                                  |
| `icon`                      |               | the icon to use, or a callback                                                                                                     |

The `icon` parameter can accept a callback to dynamically set the icon (for example, if you have different types or different icons if stores are selected).

```javascript
import iconMulti from '../img/icon-store-multi.svg';
import iconMultiSelected from '../img/icon-store-multi-selected.svg';
import iconForest from '../img/icon-forest.svg';
import iconForestSelected from '../img/icon-forest-selected.svg';

new LocationMap(element, {
  // ...
  icon: (store, selected = false) => {
    switch (store.type) {
      case 'forest':
        return {
          url: selected ? iconForestSelected : iconForest,
          anchor: { x: 10, y: 30 },
        };
      default:
        return {
          url: selected ? iconMultiSelected : iconMulti,
          anchor: { x: 10, y: 30 },
        };
    }
  },
});
```

The default settings are the following:

```javascript
const defaultSettings = {
  latitude: 0,
  longitude: 0,
  zoom: 6,
  focusedZoom: 17,
  focusedAreaZoom: 10,
  locations: [],
  displaySearch: false,
  mapProvider: null,
  searchProvider: null,
  filters: [],
  paginationSettings: {
    page: 5,
    pagination: {
      paginationClass: 'pagination',
      item: "<li><a class='page'></a></li>",
      outerWindow: 1,
    },
  },
  autocomplete: true,
  icon: null,
  clusterSettings: {},
  geolocateOnStart: true,
  scrollToGeolocation: false,
  focusOnClick: true,
  focusOnHover: false,
  focusOnHoverTimeout: 1000,
};
```

## Filtering

You can implement your own logic for creating filters on the page (for example, radio buttons or checkboxes). You can then filter the stores that are displayed, based on the their `type` property, using the `setFilters` method on the `LocationsMap` instance:

```javascript
// display only the stores with the type 'big' or 'small'
locationsMap.setFilters(['big', 'small']);
```

## Methods

You can use the following methods on the `LocationsMap` instance:

- `setFilters(newFilters)` - set the current filters for the stores to be displayed
- `updateLocations(callback)` - to update the existing of locations (for example, if you want to modify something in their info). This receives a callback as a parameter, and the callback will receive the existing locations and should return an updated list of locations.
- `setLocations(newLocations)` - to replace the set of locations (for example, if you want to load them by AJAX)
- `closePopups()` - close the active popup
- `focusOnLocation(location)` - scroll the map to a specific location
- `setMapPosition(position)` - set a new position for the map
- `geolocate()` - try to geolocate the current user
- `getSearchResults(searchValue)` (promise) - get the results for a specific search string
- `doSearch()` (promise) - search for the search string in the search form
- `setZoom(value)` - set the zoom level

## Events

There are multiple events dispatched by the location map:

- `initializing.locationsMap` before initialization. It allows you to change the settings.
- `initialized.locationsMap` after the map has been initialized
- `parseLocations.locationsMap` triggered after parsing the locations
- `appliedFilters.locationsMap` after filters are updated
- `updatedLocations.locationsMap` before the locations list is updated, for example after geolocation
- `updatedLocationListContent.locationsMap` after the location list has been updated
- `search.locationsMap` (cancelable) - when the search form is submitted, before starting the search
- `updatingFromSearch.locationsMap` (cancelable) - when search is starting
- `updatedFromSearch.locationsMap` after search has been done
- `showPopup` (cancelable) - when a location is clicked and a popup should be displayed
- `showPopupOnMap.locationsMap` (cancelable) - when a location is clicked and a popup should be displayed on the map
- `showPopupOutsideMap.locationsMap` (cancelable) - when a location is clicked and a popup should be displayed outside the map
- `listClick.locationsMap` (cancelable) - when a location is clicked in the list, and the map should scroll to it and close existing popups
- `listHover.locationsMap` (cancelable) - when a location is hovered in the list, and the map should scroll to it
- `updatedMapPosition.locationsMap` when the map position has been changed

## More info

The stores/locations lists and its pagination is created using [`list.js`](https://listjs.com/).
The autocomplete functionality is based on [`@tarekraafat/autocomplete.js`](https://tarekraafat.github.io/autoComplete.js/).

For more info, see the TypeScript definitions and the existing code.
