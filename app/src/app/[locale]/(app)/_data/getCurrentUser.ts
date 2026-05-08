import { cache } from "react";
import { redirect } from "next/navigation";
import { AuthError } from "@/domain/errors/AuthError";
import { authGateway } from "@/infrastructure/registry";
import { getLocale } from "@/lib/pathname";

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
 * Wrapped with React.cache() so that layout + page share a single request
 * per server render pass.
 */
export const getCurrentUser = cache(async function getCurrentUser() {
  try {
    return await authGateway.getCurrentUser();
  } catch (err) {
    const code = err instanceof AuthError ? err.code : "UNAUTHENTICATED";
    const locale = await getLocale();
    redirect(`/${locale}/login?error=${code}`);
  }
});
