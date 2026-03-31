import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import type { User } from "@/domain/models/User";
import { authGateway } from "@/infrastructure/registry";

/**
 * Returns the current user or null if not authenticated.
 * Unlike the (app) helper, this never redirects — marketing pages are public.
 */
export async function getOptionalUser(): Promise<User | null> {
  try {
    return await new GetCurrentUser(authGateway).execute();
  } catch {
    return null;
  }
}
