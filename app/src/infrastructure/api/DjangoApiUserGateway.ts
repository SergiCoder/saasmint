import type {
  IUserGateway,
  UpdateProfileInput,
} from "@/application/ports/IUserGateway";
import type { User } from "@/domain/models/User";
import { apiFetch, apiFetchVoid } from "./apiClient";
import { keysToSnake } from "./caseTransform";
import { parseUser } from "./parsers";

export class DjangoApiUserGateway implements IUserGateway {
  async getProfile(): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/account/");
    return parseUser(raw);
  }

  async updateProfile(input: UpdateProfileInput): Promise<User> {
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

  async uploadAvatar(formData: FormData): Promise<{ avatarUrl: string }> {
    const raw = await apiFetch<{ avatar_url: string }>("/account/avatar/", {
      method: "POST",
      body: formData,
    });
    return { avatarUrl: raw.avatar_url };
  }

  async deleteAvatar(): Promise<void> {
    await apiFetchVoid("/account/avatar/", { method: "DELETE" });
  }
}
