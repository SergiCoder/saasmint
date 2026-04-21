import type { User } from "@/domain/models/User";
import { AuthError } from "@/domain/errors/AuthError";
import type { IAuthGateway } from "@/application/ports/IAuthGateway";

/**
 * Fetches the authenticated user via the auth gateway.
 *
 * Unlike the other use-cases, this one rewraps any non-`AuthError` exception
 * into `AuthError("UNAUTHENTICATED")` so callers (pages, middleware) only
 * have to branch on one error type to render the sign-in screen. Network /
 * parse errors therefore surface as "not authenticated" rather than an
 * opaque 500 — intentional, since an auth probe that can't complete should
 * behave the same as an invalid session.
 */
export class GetCurrentUser {
  constructor(private readonly auth: IAuthGateway) {}

  async execute(): Promise<User> {
    try {
      return await this.auth.getCurrentUser();
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError(
        "Failed to retrieve current user",
        "UNAUTHENTICATED",
        { cause: err },
      );
    }
  }
}
