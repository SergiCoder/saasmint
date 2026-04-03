import type {
  IUserGateway,
  UpdateProfileInput,
} from "@/application/ports/IUserGateway";
import type { User } from "@/domain/models/User";
import { apiFetch } from "./apiClient";
import { keysToCamel, keysToSnake } from "./caseTransform";

export class DjangoApiUserGateway implements IUserGateway {
  async getProfile(_userId: string): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/account/");
    return keysToCamel<User>(raw);
  }

  async updateProfile(
    _userId: string,
    input: UpdateProfileInput,
  ): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/account/", {
      method: "PATCH",
      body: JSON.stringify(keysToSnake(input)),
    });
    return keysToCamel<User>(raw);
  }
}
