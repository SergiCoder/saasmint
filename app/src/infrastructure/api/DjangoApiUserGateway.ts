import { z } from "zod";
import type {
  IUserGateway,
  UpdateProfileInput,
} from "@/application/ports/IUserGateway";
import type { User } from "@/domain/models/User";
import { apiFetch, apiFetchVoid } from "./apiClient";
import { keysToSnake } from "./caseTransform";
import { fetchCurrentUser, parseUser } from "./parsers";

const AvatarUploadSchema = z.object({ avatar_url: z.string() });

export class DjangoApiUserGateway implements IUserGateway {
  async getProfile(): Promise<User> {
    return fetchCurrentUser();
  }

  async updateProfile(input: UpdateProfileInput): Promise<User> {
    const { phonePrefix, phone, ...rest } = input;
    // Widen at the value level (a fresh record built from `rest` whose field
    // types are subtypes of `unknown`) instead of asserting `rest` is a
    // `Record<string, unknown>`. The assertion form silently masks future
    // additions to `UpdateProfileInput` whose value types might not satisfy
    // the snake-cased payload contract.
    const restRecord: Record<string, unknown> = { ...rest };
    const payload = keysToSnake(restRecord);

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
    const raw = await apiFetch<Record<string, unknown>>("/account/avatar/", {
      method: "POST",
      body: formData,
    });
    const { avatar_url } = AvatarUploadSchema.parse(raw);
    return { avatarUrl: avatar_url };
  }

  async deleteAvatar(): Promise<void> {
    await apiFetchVoid("/account/avatar/", { method: "DELETE" });
  }
}
