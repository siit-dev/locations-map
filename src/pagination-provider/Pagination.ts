import List from 'list.js';
import { LocationsMap, PaginationProvider, PaginationSettings } from '..';

export const defaultSettings: PaginationSettings = {
  page: 5,
  pagination: {
    paginationClass: 'pagination',
    item: "<li><a class='page'></a></li>",
    outerWindow: 1,
  },
};

export default class Pagination implements PaginationProvider {
  protected paginationList?: List = null;
  parent: LocationsMap;

  constructor(protected settings: PaginationSettings = defaultSettings) {}

  setParent = (parent: LocationsMap): this => {
    this.parent = parent;
    return this;
  };

  paginate = (): this => {
    // clear the old pagination
    this.clear();

    const locationList = this.parent.getLocationsList();
    if (!locationList) return this;

    if (!locationList.querySelector('ul.pagination')) {
      locationList.innerHTML += '<ul class="pagination"></ul>';
    }

    // initialize the pagination
    if (this.parent.filteredLocations.length > this.settings.page) {
      this.paginationList = new List(locationList, this.settings);
    }

    return this;
  };

  clear = (): this => {
    if (!this.paginationList) return this;

    this.paginationList.clear();
    delete this.paginationList;
    this.paginationList = null;

    const locationList = this.parent.getLocationsList();
    if (locationList) {
      const pagination = locationList.querySelector('ul.pagination');
      if (pagination) {
        pagination.remove();
      }
    }

    return this;
  };
}
