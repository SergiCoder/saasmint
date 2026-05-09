import { isRecord } from "@/lib/typeGuards";

export function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);
}

export function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

/**
 * Recursively convert all object keys to snake_case. Arrays are mapped;
 * plain objects walked; non-plain objects (Date, Map, etc.) left untouched.
 * Inverse of `keysToCamel`. The record overload preserves the input shape
 * so callers don't need a downstream `as Record<string, unknown>` cast.
 */
export function keysToSnake(
  value: Record<string, unknown>,
): Record<string, unknown>;
export function keysToSnake(value: unknown): unknown;
export function keysToSnake(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(keysToSnake);
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[toSnakeCase(k)] = keysToSnake(v);
  }
  return out;
}

/**
 * Recursively convert all object keys to camelCase. Arrays are mapped; plain
 * objects walked; everything else returned as-is. Parse the result with a
 * schema (Zod) to get a typed value — this function does not validate shape.
 * The record overload preserves the input shape so callers don't need a
 * downstream `as Record<string, unknown>` cast.
 */
export function keysToCamel(
  value: Record<string, unknown>,
): Record<string, unknown>;
export function keysToCamel(value: unknown): unknown;
export function keysToCamel(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(keysToCamel);
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[toCamelCase(k)] = keysToCamel(v);
  }
  return out;
}

/**
 * Flatten a nested `phone: { prefix, number }` API object into flat
 * `phonePrefix` / `phone` fields on the target user object.
 */
export function flattenPhone(
  raw: Record<string, unknown>,
  user: Record<string, unknown>,
): void {
  const phoneData = raw.phone;
  if (isRecord(phoneData) && "prefix" in phoneData && "number" in phoneData) {
    user.phonePrefix = phoneData.prefix;
    user.phone = phoneData.number;
  } else {
    user.phonePrefix = null;
    user.phone = null;
  }
}

/**
 * Fill in `displayAmount` and `currency` defaults on an already-camelised
 * object whose `price` subfield may omit them. Mutates in place. Used after
 * `keysToCamel` has already walked the tree.
 */
export function applyPriceDefaults(
  camel: Record<string, unknown>,
  fallbackCurrency = "usd",
): void {
  // `isRecord` rejects arrays (`typeof [] === "object"`) and `null`,
  // narrowing without an unchecked cast.
  const price = camel.price;
  if (!isRecord(price)) return;
  if (price.displayAmount === undefined && typeof price.amount === "number") {
    price.displayAmount = price.amount / 100;
  }
  if (price.currency === undefined) {
    price.currency = fallbackCurrency;
  }
  if (price.localDisplayAmount === undefined) {
    price.localDisplayAmount = null;
  }
  if (price.localCurrency === undefined) {
    price.localCurrency = null;
  }
}

/**
 * Convert a raw API object's keys to camelCase and fill in `price` defaults
 * (`displayAmount`, `currency`) when the API omits them. Covers Plan,
 * Product, and top-level Subscription responses.
 */
export function keysToCamelWithPrice(
  raw: Record<string, unknown>,
  fallbackCurrency = "usd",
): Record<string, unknown> {
  const result = keysToCamel(raw);
  applyPriceDefaults(result, fallbackCurrency);
  return result;
}
