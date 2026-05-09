/**
 * Generic memoised cache for `Intl.*Format` instances.
 *
 * Constructing an `Intl.NumberFormat` or `Intl.DateTimeFormat` allocates
 * locale data and is non-trivial; a per-locale/per-options key cache avoids
 * the allocation when formatting many values in a single render. The
 * `maxSize` cap protects long-running server processes against unbounded
 * growth — once the cap is hit the cache clears wholesale (the working set
 * for our locale × currency surface is well below the cap, so steady-state
 * behaviour is unaffected; the eviction only triggers pathologically).
 */
export function createFormatterCache<F>(
  maxSize: number,
  factory: (key: string) => F,
): (key: string) => F {
  const cache = new Map<string, F>();
  return (key) => {
    let value = cache.get(key);
    if (!value) {
      if (cache.size >= maxSize) cache.clear();
      value = factory(key);
      cache.set(key, value);
    }
    return value;
  };
}
