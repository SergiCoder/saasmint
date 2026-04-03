import { cache } from "react";
import { redirect } from "next/navigation";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { AuthError } from "@/domain/errors/AuthError";
import { authGateway } from "@/infrastructure/registry";

/**
 * Fetches the current user, redirecting to /login on auth failure.
 * Use in (app) server components instead of calling GetCurrentUser directly,
 * because Next.js renders layout and page in parallel — the layout's redirect
 * cannot prevent the page from executing.
 *
 * Wrapped with React.cache() so that layout + page share a single request
 * per server render pass.
 */
export const getCurrentUser = cache(async function getCurrentUser() {
  try {
    return await new GetCurrentUser(authGateway).execute();
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/login?error=${err.code}`);
    }
    throw err;
  }
});
