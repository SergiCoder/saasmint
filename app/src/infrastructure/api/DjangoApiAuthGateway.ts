import type {
  DeleteAccountResult,
  IAuthGateway,
} from "@/application/ports/IAuthGateway";
import type { User } from "@/domain/models/User";
import { apiFetch } from "./apiClient";
import { flattenPhone, keysToCamel } from "./caseTransform";
import {
  clearAuthCookies,
  getRefreshToken,
} from "@/infrastructure/auth/cookies";

export class DjangoApiAuthGateway implements IAuthGateway {
  async getCurrentUser(): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/account/");
    const user = keysToCamel<User>(raw);
    flattenPhone(raw, user);
    return user;
  }

  async signOut(): Promise<void> {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      await apiFetch("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
    await clearAuthCookies();
  }

  async deleteAccount(): Promise<DeleteAccountResult> {
    const res = await apiFetch<{ scheduled_deletion_at: string } | undefined>(
      "/account/",
      { method: "DELETE" },
    );
    await clearAuthCookies();
    return {
      scheduledDeletionAt: res?.scheduled_deletion_at ?? null,
    };
  }

  async cancelDeletion(): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>(
      "/account/cancel-deletion/",
      { method: "POST" },
    );
    const user = keysToCamel<User>(raw);
    flattenPhone(raw, user);
    return user;
  }
}
