/**
 * @example
 * ```tsx
 * useEffect(() => {
 *  return cleanup(
 *   onListener1(),
 *   onListener2(),
 *   onListener3(),
 *  );
 * }, []);
 * ```
 */
export function cleanup(...cleaners: VoidFunction[]) {
  return function () {
    cleaners.forEach(cleaner => cleaner());
  };
}

export function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
