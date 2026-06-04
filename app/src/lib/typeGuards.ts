export function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Type-narrowing membership check for `as const` literal-tuple arrays. The
 * built-in `Array.includes` types its `searchElement` to the tuple's literal
 * union, so calling `.includes(unknownString)` becomes a type error. This
 * helper performs the runtime check and narrows `value` to the tuple's
 * element type, replacing scattered `(arr as readonly string[]).includes(x)`
 * casts at call sites.
 */
export function isMemberOf<T extends string>(
  arr: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === "string" && (arr as readonly string[]).includes(value)
  );
}
