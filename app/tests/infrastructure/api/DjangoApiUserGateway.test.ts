import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { DjangoApiUserGateway } =
  await import("@/infrastructure/api/DjangoApiUserGateway");

const snakeUser = {
  id: "u1",
  supabase_uid: "sb-u1",
  email: "alice@example.com",
  full_name: "Alice",
  avatar_url: null,
  account_type: "personal",
  preferred_locale: "en",
  preferred_currency: "USD",
  phone_prefix: null,
  phone: null,
  timezone: null,
  job_title: null,
  pronouns: null,
  bio: null,
  is_verified: true,
  created_at: "2024-01-01T00:00:00Z",
};

const camelUser = {
  id: "u1",
  supabaseUid: "sb-u1",
  email: "alice@example.com",
  fullName: "Alice",
  avatarUrl: null,
  accountType: "personal",
  preferredLocale: "en",
  preferredCurrency: "USD",
  phonePrefix: null,
  phone: null,
  timezone: null,
  jobTitle: null,
  pronouns: null,
  bio: null,
  isVerified: true,
  createdAt: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DjangoApiUserGateway", () => {
  const gateway = new DjangoApiUserGateway();

  describe("getProfile", () => {
    it("fetches the user profile and converts keys to camelCase", async () => {
      mockApiFetch.mockResolvedValue(snakeUser);

      const result = await gateway.getProfile("u1");

      expect(mockApiFetch).toHaveBeenCalledWith("/account/");
      expect(result).toEqual(camelUser);
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.getProfile("u1")).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });

  describe("updateProfile", () => {
    it("sends PATCH /account/ with snake_case body", async () => {
      mockApiFetch.mockResolvedValue(snakeUser);

      const input = { fullName: "Alice Smith" };
      const result = await gateway.updateProfile("u1", input);

      expect(mockApiFetch).toHaveBeenCalledWith("/account/", {
        method: "PATCH",
        body: JSON.stringify({ full_name: "Alice Smith" }),
      });
      expect(result).toEqual(camelUser);
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(
        gateway.updateProfile("u1", { fullName: "Alice" }),
      ).rejects.toThrow("API 500: Server Error");
    });
  });
});
