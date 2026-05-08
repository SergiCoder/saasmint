import { getAccessToken } from "@/infrastructure/auth/cookies";
import { decodeJwtPayload } from "@/lib/jwtDecode";

/**
 * Decodes the `sub` claim from the access token cookie without verifying the
 * signature. The proxy middleware has already vetted the token's expiry and
 * the backend re-validates on every request — this helper is for skipping a
 * `GET /account/` round-trip when only the user ID is needed (e.g. server
 * actions doing authorization checks against `OrgMember.user.id`).
 *
 * Returns `null` when no token is present or the payload is malformed; never
 * throws. Callers that require the user object must still call
 * `authGateway.getCurrentUser()`.
 */
export async function getCurrentUserIdFromCookie(): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (payload && typeof payload.sub === "string") {
    return payload.sub;
  }
  return null;
}
