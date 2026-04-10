import type { User } from "@/domain/models/User";
import type { IAuthGateway } from "@/application/ports/IAuthGateway";

export class CancelAccountDeletion {
  constructor(private readonly auth: IAuthGateway) {}

  async execute(): Promise<User> {
    return this.auth.cancelDeletion();
  }
}
