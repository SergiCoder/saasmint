import type {
  IUserGateway,
  UpdateProfileInput,
} from "@/application/ports/IUserGateway";
import type { User } from "@/domain/models/User";
import { apiFetch } from "./apiClient";

export class DjangoApiUserGateway implements IUserGateway {
  async getProfile(_userId: string): Promise<User> {
    return apiFetch<User>("/account/");
  }

  async updateProfile(
    _userId: string,
    input: UpdateProfileInput,
  ): Promise<User> {
    return apiFetch<User>("/account/", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }
}
