import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { DjangoApiUserGateway } =
  await import("@/infrastructure/api/DjangoApiUserGateway");

const snakeUser = {
  id: "u1",
  email: "alice@example.com",
  full_name: "Alice",
  avatar_url: null,
  account_type: "personal",
  preferred_locale: "en",
  preferred_currency: "USD",
  phone: null,
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

const camelUser = {
  id: "u1",
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
  registrationMethod: "email",
  linkedProviders: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  scheduledDeletionAt: null,
};

const snakeUserWithPhone = {
  ...snakeUser,
  phone: { prefix: "+34", number: "612345678" },
};

const camelUserWithPhone = {
  ...camelUser,
  phonePrefix: "+34",
  phone: "612345678",
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

    it("flattens nested phone object into phonePrefix and phone", async () => {
      mockApiFetch.mockResolvedValue(snakeUserWithPhone);

      const result = await gateway.getProfile("u1");

      expect(result).toEqual(camelUserWithPhone);
    });

    it("sets phonePrefix and phone to null when phone is null", async () => {
      mockApiFetch.mockResolvedValue(snakeUser);

      const result = await gateway.getProfile("u1");

      expect(result.phonePrefix).toBeNull();
      expect(result.phone).toBeNull();
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

    it("nests phone prefix and number into phone object", async () => {
      mockApiFetch.mockResolvedValue(snakeUserWithPhone);

      await gateway.updateProfile("u1", {
        fullName: "Alice",
        phonePrefix: "+34",
        phone: "612345678",
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/account/", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: "Alice",
          phone: { prefix: "+34", number: "612345678" },
        }),
      });
    });

    it("sends phone as null when prefix and number are empty", async () => {
      mockApiFetch.mockResolvedValue(snakeUser);

      await gateway.updateProfile("u1", {
        fullName: "Alice",
        phonePrefix: null,
        phone: null,
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/account/", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: "Alice",
          phone: null,
        }),
      });
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(
        gateway.updateProfile("u1", { fullName: "Alice" }),
      ).rejects.toThrow("API 500: Server Error");
    });
  });
});
