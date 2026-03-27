import type { User } from "@/domain/models/User";
import type {
  IUserGateway,
  UpdateProfileInput,
} from "@/application/ports/IUserGateway";

export class UpdateUserProfile {
  constructor(private readonly users: IUserGateway) {}

  async execute(userId: string, input: UpdateProfileInput): Promise<User> {
    return this.users.updateProfile(userId, input);
  }
}
