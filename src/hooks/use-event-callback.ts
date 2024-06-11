import { useCallback, useEffect, useRef } from 'react';

export function useEventCallback<Args extends unknown[], R>(fn: (...args: Args) => R) {
  const cache = useRef<typeof fn>(() => {
    throw new Error('Cannot call an event handler while rendering.');
  });
  useEffect(() => {
    cache.current = fn;
  }, [fn]);
  return useCallback((...args: Args) => cache.current(...args), []);
}
