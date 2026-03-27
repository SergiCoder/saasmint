import type {
  IUserGateway,
  UpdateProfileInput,
} from "@/application/ports/IUserGateway";
import type { User } from "@/domain/models/User";
import { apiFetch, getAuthToken } from "./apiClient";

export class DjangoApiUserGateway implements IUserGateway {
  async getProfile(_userId: string): Promise<User> {
    const token = await getAuthToken();
    return apiFetch<User>("/account/", token);
  }

  async updateProfile(
    _userId: string,
    input: UpdateProfileInput,
  ): Promise<User> {
    const token = await getAuthToken();
    return apiFetch<User>("/account/", token, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }
}
