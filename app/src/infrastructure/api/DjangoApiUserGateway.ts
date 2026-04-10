import type {
  IUserGateway,
  UpdateProfileInput,
} from "@/application/ports/IUserGateway";
import type { User } from "@/domain/models/User";
import { apiFetch } from "./apiClient";
import { flattenPhone, keysToCamel, keysToSnake } from "./caseTransform";

export class DjangoApiUserGateway implements IUserGateway {
  async getProfile(_userId: string): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/account/");
    const user = keysToCamel<User>(raw);
    flattenPhone(raw, user);
    return user;
  }

  async updateProfile(
    _userId: string,
    input: UpdateProfileInput,
  ): Promise<User> {
    const { phonePrefix, phone, ...rest } = input;
    const payload: Record<string, unknown> = keysToSnake(rest);

    if ("phonePrefix" in input || "phone" in input) {
      payload.phone =
        phonePrefix && phone ? { prefix: phonePrefix, number: phone } : null;
    }

    const raw = await apiFetch<Record<string, unknown>>("/account/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const user = keysToCamel<User>(raw);
    flattenPhone(raw, user);
    return user;
  }
}
