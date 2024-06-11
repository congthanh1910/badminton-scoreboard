import { isNil } from 'lodash';

export type Nullable<T> = T | null;

export type Maybe<T> = T | null | undefined;

export type Thunk<T> = T | (() => T);

/** This seems to force TS to show the full type instead of all the wrapped generics */
/* eslint @typescript-eslint/ban-types: ["error", { "types": { "{}": false }, "extendDefaults": true }] */
export type _<T> = T extends {} ? { [k in keyof T]: T[k] } : T;

export function isNotNil<T>(value: Maybe<T>): value is T {
  return !isNil(value);
}
