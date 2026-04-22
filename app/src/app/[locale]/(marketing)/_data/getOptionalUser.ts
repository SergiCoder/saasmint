import { AuthError } from "@/domain/errors/AuthError";
import type { User } from "@/domain/models/User";
import { authGateway } from "@/infrastructure/registry";

/**
 * Returns the current user or null if not authenticated.
 * Unlike the (app) helper, this never redirects — marketing pages are public.
 * Non-auth errors (network, parse) are treated as "not authenticated".
 */
export async function getOptionalUser(): Promise<User | null> {
  try {
    return await authGateway.getCurrentUser();
  } catch (err) {
    if (err instanceof AuthError) return null;
    throw err;
  }
}
