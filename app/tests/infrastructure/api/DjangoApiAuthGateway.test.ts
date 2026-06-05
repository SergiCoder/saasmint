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
};

const camelUserBase = {
  id: "u1",
  email: "alice@example.com",
  fullName: "Alice",
  avatarUrl: null,
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
      mockApiFetchVoid.mockResolvedValue(undefined);
      mockClearAuthCookies.mockResolvedValue(undefined);

      await gateway.deleteAccount();

      expect(mockApiFetchVoid).toHaveBeenCalledWith("/account/", {
        method: "DELETE",
      });
      expect(mockClearAuthCookies).toHaveBeenCalledOnce();
    });
  });
});
