import { isRecord } from "@/lib/typeGuards";

/**
 * Edge-safe JWT payload decoder. Pure base64+JSON; no signature verification,
 * no cookie dependency. The middleware vets expiry; the backend re-validates
 * on every request — this helper only needs to read claims.
 *
 * Returns `null` when the token is missing or malformed; never throws.
 */
export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const payload: unknown = JSON.parse(atob(parts[1]));
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}
