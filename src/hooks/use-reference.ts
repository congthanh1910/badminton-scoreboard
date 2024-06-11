import { useCallback, useEffect, useRef } from 'react';

export function useReference<T>(value: T) {
  const cache = useRef(value);
  const isMounted = useRef(false);
  useEffect(() => {
    cache.current = value;
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, [value]);
  return useCallback(() => {
    if (isMounted.current) return cache.current;
    throw new Error('Cannot get value while rendering.');
  }, []);
}
