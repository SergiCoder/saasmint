import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@/domain/models/User";
import { AuthError } from "@/domain/errors/AuthError";
import { authGateway } from "@/infrastructure/registry";
import { getLocale } from "@/lib/pathname";
import { isLoginErrorCode } from "@/app/[locale]/(auth)/_lib/loginErrorCodes";

/**
 * Pure cached fetch of the current user. Kept separate from `getCurrentUser`
 * because `React.cache` does not memoize thrown values — folding the redirect
 * throw into the cached function would make every caller re-run the full
 * `GET /account/` round-trip on auth failure, defeating the cache.
 */
const fetchCurrentUser = cache(function fetchCurrentUser(): Promise<User> {
  return authGateway.getCurrentUser();
});

/**
 * Fetches the current user, redirecting to /login on any failure.
 * Use in (app) server components instead of calling the gateway directly,
 * because Next.js renders layout and page in parallel — the layout's redirect
 * cannot prevent the page from executing.
 *
 * Any non-auth error (network, parse) is coerced to an auth failure so an
 * auth probe that can't complete still surfaces the sign-in screen rather
 * than an opaque 500.
 *
 * The successful path is cached via `fetchCurrentUser` so layout + page share
 * a single request per server render pass; the failure path falls through to
 * `redirect`, which throws and is intentionally not cached.
 */
export async function getCurrentUser(): Promise<User> {
  try {
    return await fetchCurrentUser();
  } catch (err) {
    const rawCode = err instanceof AuthError ? err.code : "UNAUTHENTICATED";
    // Backend codes flow through `AuthError.code` from the 401 response body;
    // coerce anything outside the known set to `UNAUTHENTICATED` so a
    // surprise payload can't reach the URL.
    const code = isLoginErrorCode(rawCode) ? rawCode : "UNAUTHENTICATED";
    const locale = await getLocale();
    redirect(`/${locale}/login?error=${encodeURIComponent(code)}`);
  }
}
