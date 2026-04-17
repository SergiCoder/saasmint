import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiFetch = vi.fn();
const mockApiFetchVoid = vi.fn();
const mockClearAuthCookies = vi.fn();
const mockGetRefreshToken = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiFetchVoid: (...args: unknown[]) => mockApiFetchVoid(...args),
}));

vi.mock("@/infrastructure/auth/cookies", () => ({
  clearAuthCookies: () => mockClearAuthCookies(),
  getRefreshToken: () => mockGetRefreshToken(),
}));

const { DjangoApiAuthGateway } =
  await import("@/infrastructure/api/DjangoApiAuthGateway");

const snakeUserBase = {
  id: "u1",
  email: "alice@example.com",
  full_name: "Alice",
  avatar_url: null,
  account_type: "personal",
  preferred_locale: "en",
  preferred_currency: "USD",
  timezone: null,
  job_title: null,
  pronouns: null,
  bio: null,
  is_verified: true,
  registration_method: "email",
  linked_providers: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  scheduled_deletion_at: null,
};

const camelUserBase = {
  id: "u1",
  email: "alice@example.com",
  fullName: "Alice",
  avatarUrl: null,
  accountType: "personal",
  preferredLocale: "en",
  preferredCurrency: "USD",
  timezone: null,
  jobTitle: null,
  pronouns: null,
  bio: null,
  isVerified: true,
  registrationMethod: "email",
  linkedProviders: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  scheduledDeletionAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DjangoApiAuthGateway", () => {
  const gateway = new DjangoApiAuthGateway();

  describe("getCurrentUser", () => {
    it("fetches /account/ and converts keys to camelCase", async () => {
      mockApiFetch.mockResolvedValue({
        ...snakeUserBase,
        phone: { prefix: "+1", number: "5551234" },
      });

      const result = await gateway.getCurrentUser();

      expect(mockApiFetch).toHaveBeenCalledWith("/account/");
      expect(result).toEqual({
        ...camelUserBase,
        phonePrefix: "+1",
        phone: "5551234",
      });
    });

    it("sets phone fields to null when phone is absent", async () => {
      mockApiFetch.mockResolvedValue({ ...snakeUserBase, phone: null });

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
      mockApiFetchVoid.mockResolvedValue(undefined);
      mockClearAuthCookies.mockResolvedValue(undefined);

      await gateway.signOut();

      expect(mockApiFetchVoid).toHaveBeenCalledWith("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh_token: "refresh_abc" }),
      });
      expect(mockClearAuthCookies).toHaveBeenCalledOnce();
    });

    it("skips the API call and only clears cookies when no refresh token", async () => {
      mockGetRefreshToken.mockResolvedValue(undefined);
      mockClearAuthCookies.mockResolvedValue(undefined);

      await gateway.signOut();

      expect(mockApiFetchVoid).not.toHaveBeenCalled();
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
        ...snakeUserBase,
        phone: { prefix: "+44", number: "7700900000" },
      });

      const result = await gateway.cancelDeletion();

      expect(mockApiFetch).toHaveBeenCalledWith("/account/cancel-deletion/", {
        method: "POST",
      });
      expect(result).toEqual({
        ...camelUserBase,
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
