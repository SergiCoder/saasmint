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
 * Inverse of `keysToCamel`.
 */
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
 * schema (Zod) to get a typed value — the returned type is deliberately
 * `unknown` because this function does not validate shape.
 */
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
  if (
    phoneData &&
    typeof phoneData === "object" &&
    "prefix" in phoneData &&
    "number" in phoneData
  ) {
    user.phonePrefix = (phoneData as { prefix: unknown }).prefix;
    user.phone = (phoneData as { number: unknown }).number;
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
  const price = camel.price;
  if (!price || typeof price !== "object") return;
  const camelPrice = price as Record<string, unknown>;
  if (
    camelPrice.displayAmount === undefined &&
    typeof camelPrice.amount === "number"
  ) {
    camelPrice.displayAmount = camelPrice.amount / 100;
  }
  if (camelPrice.currency === undefined) {
    camelPrice.currency = fallbackCurrency;
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
  const result = keysToCamel(raw) as Record<string, unknown>;
  applyPriceDefaults(result, fallbackCurrency);
  return result;
}
