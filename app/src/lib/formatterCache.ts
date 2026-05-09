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
    // `Map.has` is the correct cache-miss sentinel: a `get(key)` truthiness
    // check would re-invoke the factory whenever the cached value was a
    // legitimate falsy value (`0`, `""`, `null`).
    if (!cache.has(key)) {
      if (cache.size >= maxSize) cache.clear();
      cache.set(key, factory(key));
    }
    return cache.get(key) as F;
  };
}
