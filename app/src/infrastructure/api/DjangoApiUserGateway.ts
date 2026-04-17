import type {
  IUserGateway,
  UpdateProfileInput,
} from "@/application/ports/IUserGateway";
import type { User } from "@/domain/models/User";
import { apiFetch } from "./apiClient";
import { keysToSnake } from "./caseTransform";
import { parseUser } from "./parsers";

export class DjangoApiUserGateway implements IUserGateway {
  async getProfile(_userId: string): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/account/");
    return parseUser(raw);
  }

  async updateProfile(
    _userId: string,
    input: UpdateProfileInput,
  ): Promise<User> {
    const { phonePrefix, phone, ...rest } = input;
    const payload = keysToSnake(rest) as Record<string, unknown>;

    if ("phonePrefix" in input || "phone" in input) {
      payload.phone =
        phonePrefix && phone ? { prefix: phonePrefix, number: phone } : null;
    }

    const raw = await apiFetch<Record<string, unknown>>("/account/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return parseUser(raw);
  }
}
