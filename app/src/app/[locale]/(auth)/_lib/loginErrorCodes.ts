/**
 * Allow-list of error codes that may appear in the `?error=...` query param
 * on the login page. Server-side redirect builders (`getCurrentUser`,
 * OAuth callbacks) coerce any backend-supplied code that isn't in this set
 * to `UNAUTHENTICATED` before forwarding to the URL — defense-in-depth so
 * an unexpected backend payload can't reach the redirect builder unfiltered.
 *
 * The login page itself reads `ERROR_KEYS[code]`, which fails closed for
 * unknown codes; this allow-list closes the gap on the URL-construction side.
 */
export const LOGIN_ERROR_CODES = [
  "NO_SESSION",
  "BACKEND_REJECTED",
  "UNAUTHENTICATED",
  "email_not_verified",
  "token_expired",
  "account_deactivated",
  "account_deleted",
  "oauth_error",
  "oauth_email_unverified_collision",
] as const;

export type LoginErrorCode = (typeof LOGIN_ERROR_CODES)[number];

export function isLoginErrorCode(value: string): value is LoginErrorCode {
  return (LOGIN_ERROR_CODES as readonly string[]).includes(value);
}
