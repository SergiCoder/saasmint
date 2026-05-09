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
    // JWTs use base64url (RFC 7515), which substitutes `-`/`_` for `+`/`/`
    // and may omit `=` padding. `atob` only decodes standard base64, so
    // normalise the payload before decoding — otherwise tokens with `-` or
    // `_` characters silently fail and force a refresh on every request.
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload: unknown = JSON.parse(atob(base64));
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}
