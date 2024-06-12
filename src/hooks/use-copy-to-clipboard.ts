import { useCallback } from 'react';

export function useCopyToClipboard() {
  return useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }, []);
}
