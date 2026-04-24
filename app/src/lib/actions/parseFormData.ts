/**
 * Tiny typed accessors for server-action `FormData` reads. Each helper
 * returns the narrowed value or `undefined` — callers decide how to report
 * missing or invalid fields (usually by returning `fail("invalid_input")`
 * from the enclosing action).
 */

export function getString(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
}

export function getNonEmptyString(
  fd: FormData,
  key: string,
): string | undefined {
  const v = getString(fd, key);
  return v && v.length > 0 ? v : undefined;
}

export function getInt(fd: FormData, key: string): number | undefined {
  const v = getString(fd, key);
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function getFile(fd: FormData, key: string): File | undefined {
  const v = fd.get(key);
  return v instanceof File && v.size > 0 ? v : undefined;
}
