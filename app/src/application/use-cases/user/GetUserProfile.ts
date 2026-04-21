import type { User } from "@/domain/models/User";
import type { IUserGateway } from "@/application/ports/IUserGateway";

export class GetUserProfile {
  constructor(private readonly users: IUserGateway) {}

  async execute(): Promise<User> {
    return this.users.getProfile();
  }
}
