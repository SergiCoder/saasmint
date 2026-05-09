import type { IAuthGateway } from "@/application/ports/IAuthGateway";
import type { User } from "@/domain/models/User";
import { apiFetchVoid } from "./apiClient";
import { fetchCurrentUser } from "./parsers";
import {
  clearAuthCookies,
  getRefreshToken,
} from "@/infrastructure/auth/cookies";

export class DjangoApiAuthGateway implements IAuthGateway {
  async getCurrentUser(): Promise<User> {
    return fetchCurrentUser();
  }

  async signOut(): Promise<void> {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      await apiFetchVoid("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
    await clearAuthCookies();
  }

  async deleteAccount(): Promise<void> {
    await apiFetchVoid("/account/", { method: "DELETE" });
    await clearAuthCookies();
  }
}
