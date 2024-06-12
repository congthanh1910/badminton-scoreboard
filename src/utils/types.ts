export type Nullable<T> = T | null;

/** This seems to force TS to show the full type instead of all the wrapped generics */
/* eslint @typescript-eslint/ban-types: ["error", { "types": { "{}": false }, "extendDefaults": true }] */
export type _<T> = T extends {} ? { [k in keyof T]: T[k] } : T;
