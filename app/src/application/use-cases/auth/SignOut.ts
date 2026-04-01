import { AuthError } from "@/domain/errors/AuthError";
import type { IAuthGateway } from "@/application/ports/IAuthGateway";

export class SignOut {
  constructor(private readonly auth: IAuthGateway) {}

  async execute(): Promise<void> {
    try {
      await this.auth.signOut();
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError("Sign out failed", "SIGN_OUT_FAILED", { cause: err });
    }
  }
}
