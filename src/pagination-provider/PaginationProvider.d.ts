import { ListOptions } from 'list.js';
import { LocationsMap } from '..';

export interface PaginationSettings extends ListOptions {
  [key: string]: unknown;
}

export interface PaginationProvider {
  parent: LocationsMap;

  setParent: (parent: LocationsMap) => this;
  paginate: () => void;
  clear: () => void;
}
