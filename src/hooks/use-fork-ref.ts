import { useMemo } from 'react';
import { isFunction, isNull } from 'lodash';
import { Maybe, Nullable } from '@/utils/types';

export function useForkRef<T>(...refs: Maybe<React.Ref<T>>[]) {
  /**
   * This will create a new function if the refs passed to this hook change and are all defined.
   * This means react will call the old forkRef with `null` and the new forkRef
   * with the ref. Cleanup naturally emerges from this behavior.
   */
  return useMemo<Nullable<React.RefCallback<T>>>(() => {
    if (refs.every(isNull)) return null;
    return instance => {
      refs.forEach(ref => {
        setRef(ref, instance);
      });
    };
  }, refs); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Useful if you want to expose the ref of an inner component to the public API
 * while still using it inside the component.
 * @param ref A ref callback or ref object. If anything falsy, this is a no-op.
 */
function setRef<T>(
  ref: React.MutableRefObject<Nullable<T>> | Maybe<React.RefCallback<T>>,
  value: T | null
) {
  if (isFunction(ref)) {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}
