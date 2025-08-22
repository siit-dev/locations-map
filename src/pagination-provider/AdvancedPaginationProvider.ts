import { LocationsMap } from '..';

export abstract class AdvancedPaginationProvider {
  parent: LocationsMap | null = null;
  target: HTMLElement | null = null;

  abstract setParent: (parent: LocationsMap) => this;
  abstract setTarget: (target: HTMLElement) => this;
  abstract update: () => this;
  abstract clear: () => this;
}
