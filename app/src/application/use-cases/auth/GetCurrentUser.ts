import type { User } from "@/domain/models/User";
import { AuthError } from "@/domain/errors/AuthError";
import type { IAuthGateway } from "@/application/ports/IAuthGateway";

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
