import { AuthError } from "@/domain/errors/AuthError";
import type {
  DeleteAccountResult,
  IAuthGateway,
} from "@/application/ports/IAuthGateway";

export class DeleteAccount {
  constructor(private readonly auth: IAuthGateway) {}

  async execute(): Promise<DeleteAccountResult> {
    try {
      return await this.auth.deleteAccount();
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError("Account deletion failed", "DELETE_ACCOUNT_FAILED", {
        cause: err,
      });
    }
  }
}
