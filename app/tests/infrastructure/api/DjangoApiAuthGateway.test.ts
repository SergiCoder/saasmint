import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiFetch = vi.fn();
const mockClearAuthCookies = vi.fn();
const mockGetRefreshToken = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/infrastructure/auth/cookies", () => ({
  clearAuthCookies: () => mockClearAuthCookies(),
  getRefreshToken: () => mockGetRefreshToken(),
}));

const { DjangoApiAuthGateway } =
  await import("@/infrastructure/api/DjangoApiAuthGateway");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DjangoApiAuthGateway", () => {
  const gateway = new DjangoApiAuthGateway();

  describe("getCurrentUser", () => {
    it("fetches /account/ and converts keys to camelCase", async () => {
      mockApiFetch.mockResolvedValue({
        id: "u1",
        email: "alice@example.com",
        full_name: "Alice",
        avatar_url: null,
        account_type: "personal",
        preferred_locale: "en",
        preferred_currency: "USD",
        is_verified: true,
        phone: { prefix: "+1", number: "5551234" },
      });

      const result = await gateway.getCurrentUser();

      expect(mockApiFetch).toHaveBeenCalledWith("/account/");
      expect(result).toEqual({
        id: "u1",
        email: "alice@example.com",
        fullName: "Alice",
        avatarUrl: null,
        accountType: "personal",
        preferredLocale: "en",
        preferredCurrency: "USD",
        isVerified: true,
        phonePrefix: "+1",
        phone: "5551234",
      });
    });

    it("sets phone fields to null when phone is absent", async () => {
      mockApiFetch.mockResolvedValue({
        id: "u1",
        email: "alice@example.com",
        full_name: "Alice",
        avatar_url: null,
        account_type: "personal",
        preferred_locale: "en",
        preferred_currency: "USD",
        is_verified: true,
      });

      const result = await gateway.getCurrentUser();

      expect(result.phonePrefix).toBeNull();
      expect(result.phone).toBeNull();
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.getCurrentUser()).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });

  describe("signOut", () => {
    it("sends refresh_token to /auth/logout/ and clears cookies", async () => {
      mockGetRefreshToken.mockResolvedValue("refresh_abc");
      mockApiFetch.mockResolvedValue(undefined);
      mockClearAuthCookies.mockResolvedValue(undefined);

      await gateway.signOut();

      expect(mockApiFetch).toHaveBeenCalledWith("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh_token: "refresh_abc" }),
      });
      expect(mockClearAuthCookies).toHaveBeenCalledOnce();
    });

    it("skips the API call and only clears cookies when no refresh token", async () => {
      mockGetRefreshToken.mockResolvedValue(undefined);
      mockClearAuthCookies.mockResolvedValue(undefined);

      await gateway.signOut();

      expect(mockApiFetch).not.toHaveBeenCalled();
      expect(mockClearAuthCookies).toHaveBeenCalledOnce();
    });
  });

  describe("deleteAccount", () => {
    it("sends DELETE /account/ and clears cookies", async () => {
      mockApiFetch.mockResolvedValue({
        scheduled_deletion_at: "2024-02-01T00:00:00Z",
      });
      mockClearAuthCookies.mockResolvedValue(undefined);

      const result = await gateway.deleteAccount();

      expect(mockApiFetch).toHaveBeenCalledWith("/account/", {
        method: "DELETE",
      });
      expect(mockClearAuthCookies).toHaveBeenCalledOnce();
      expect(result).toEqual({
        scheduledDeletionAt: "2024-02-01T00:00:00Z",
      });
    });

    it("returns null scheduledDeletionAt when API returns undefined", async () => {
      mockApiFetch.mockResolvedValue(undefined);
      mockClearAuthCookies.mockResolvedValue(undefined);

      const result = await gateway.deleteAccount();

      expect(result).toEqual({ scheduledDeletionAt: null });
    });
  });

  describe("cancelDeletion", () => {
    it("sends POST /account/cancel-deletion/ and returns camelCase user", async () => {
      mockApiFetch.mockResolvedValue({
        id: "u1",
        email: "alice@example.com",
        full_name: "Alice",
        avatar_url: null,
        account_type: "personal",
        phone: { prefix: "+44", number: "7700900000" },
      });

      const result = await gateway.cancelDeletion();

      expect(mockApiFetch).toHaveBeenCalledWith("/account/cancel-deletion/", {
        method: "POST",
      });
      expect(result).toEqual({
        id: "u1",
        email: "alice@example.com",
        fullName: "Alice",
        avatarUrl: null,
        accountType: "personal",
        phonePrefix: "+44",
        phone: "7700900000",
      });
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 403: Forbidden"));

      await expect(gateway.cancelDeletion()).rejects.toThrow(
        "API 403: Forbidden",
      );
    });
  });
});
