export interface AutoCompleteConfig {
  id?: number | string;
  name?: string;
  selector?: string | Function;
  data: {
    src: string[] | any[] | Function;
    keys?: string[];
    cache?: boolean;
    filter?: Function;
  };
  trigger?: Function;
  query?: Function;
  placeHolder?: string;
  threshold?: number;
  debounce?: number;
  wrapper?: boolean;
  searchEngine?: string | Function;
  diacritics?: boolean;
  resultsList?: {
    maxResults?: number;
    tag?: string;
    id?: string;
    destination?: string;
    position?: string;
    noResults?: boolean;
    element?: (list: HTMLElement, data: any) => void;
  };
  resultItem?: {
    tag?: string;
    class?: string;
    highlight?: string;
    selected?: string;
    element: (item: HTMLElement, data: any) => void;
  };
}
