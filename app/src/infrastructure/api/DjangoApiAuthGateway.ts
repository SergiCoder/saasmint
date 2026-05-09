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
    // Clear local cookies even if the backend revoke fails (network error,
    // 5xx, missing token). Otherwise a transient outage would leave a stale
    // session live in the browser and let the next page load attempt to use
    // an access token whose refresh has already been invalidated upstream.
    const refreshToken = await getRefreshToken();
    try {
      if (refreshToken) {
        await apiFetchVoid("/auth/logout/", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } finally {
      await clearAuthCookies();
    }
  }

  async deleteAccount(): Promise<void> {
    await apiFetchVoid("/account/", { method: "DELETE" });
    await clearAuthCookies();
  }
}
