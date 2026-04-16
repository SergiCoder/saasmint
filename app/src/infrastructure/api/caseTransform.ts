export function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);
}

export function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

export function keysToSnake<T extends object>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnakeCase(k)] = v;
  }
  return out;
}

export function keysToCamel<T>(obj: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toCamelCase(k)] = v;
  }
  return out as T;
}

/**
 * Convert a raw API object's top-level keys to camelCase and, when a nested
 * `price` object is present, convert its keys as well.  Covers Plan, Product,
 * and Subscription responses that embed a price sub-object.
 */
/**
 * Flatten a nested `phone: { prefix, number }` API object into flat
 * `phonePrefix` / `phone` fields on the target user object.
 */
export function flattenPhone(raw: Record<string, unknown>, user: object): void {
  const phoneData = raw.phone as
    | { prefix: string; number: string }
    | null
    | undefined;

  const target = user as Record<string, unknown>;
  if (phoneData && typeof phoneData === "object") {
    target.phonePrefix = phoneData.prefix;
    target.phone = phoneData.number;
  } else {
    target.phonePrefix = null;
    target.phone = null;
  }
}

/**
 * Convert a raw API object's top-level keys to camelCase and, when a nested
 * `price` object is present, convert its keys as well.  Covers Plan, Product,
 * and Subscription responses that embed a price sub-object.
 */
export function keysToCamelWithPrice<T>(
  raw: Record<string, unknown>,
  fallbackCurrency = "usd",
): T {
  const result = keysToCamel<T>(raw);
  if (raw.price && typeof raw.price === "object") {
    const camelPrice = keysToCamel<Record<string, unknown>>(
      raw.price as Record<string, unknown>,
    );
    // The API may omit displayAmount and currency — derive them from amount.
    if (camelPrice.displayAmount === undefined && camelPrice.amount != null) {
      camelPrice.displayAmount = (camelPrice.amount as number) / 100;
    }
    if (camelPrice.currency === undefined) {
      camelPrice.currency = fallbackCurrency;
    }
    (result as Record<string, unknown>).price = camelPrice;
  }
  return result;
}
