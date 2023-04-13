export type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];
