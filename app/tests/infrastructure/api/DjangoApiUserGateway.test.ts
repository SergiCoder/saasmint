import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiFetch = vi.fn();
const mockApiFetchVoid = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiFetchVoid: (...args: unknown[]) => mockApiFetchVoid(...args),
}));

const { DjangoApiUserGateway } =
  await import("@/infrastructure/api/DjangoApiUserGateway");

const snakeUser = {
  id: "u1",
  email: "alice@example.com",
  full_name: "Alice",
  avatar_url: null,
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
};

const camelUser = {
  id: "u1",
  email: "alice@example.com",
  fullName: "Alice",
  avatarUrl: null,
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

      const result = await gateway.getProfile();

      expect(mockApiFetch).toHaveBeenCalledWith("/account/");
      expect(result).toEqual(camelUser);
    });

    it("flattens nested phone object into phonePrefix and phone", async () => {
      mockApiFetch.mockResolvedValue(snakeUserWithPhone);

      const result = await gateway.getProfile();

      expect(result).toEqual(camelUserWithPhone);
    });

    it("sets phonePrefix and phone to null when phone is null", async () => {
      mockApiFetch.mockResolvedValue(snakeUser);

      const result = await gateway.getProfile();

      expect(result.phonePrefix).toBeNull();
      expect(result.phone).toBeNull();
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.getProfile()).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });

  describe("updateProfile", () => {
    it("sends PATCH /account/ with snake_case body", async () => {
      mockApiFetch.mockResolvedValue(snakeUser);

      const input = { fullName: "Alice Smith" };
      const result = await gateway.updateProfile(input);

      expect(mockApiFetch).toHaveBeenCalledWith("/account/", {
        method: "PATCH",
        body: JSON.stringify({ full_name: "Alice Smith" }),
      });
      expect(result).toEqual(camelUser);
    });

    it("nests phone prefix and number into phone object", async () => {
      mockApiFetch.mockResolvedValue(snakeUserWithPhone);

      await gateway.updateProfile({
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

      await gateway.updateProfile({
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
        gateway.updateProfile({ fullName: "Alice" }),
      ).rejects.toThrow("API 500: Server Error");
    });
  });

  describe("uploadAvatar", () => {
    it("sends POST /account/avatar/ with FormData and maps avatar_url", async () => {
      mockApiFetch.mockResolvedValue({ avatar_url: "https://cdn/avatar.webp" });

      const formData = new FormData();
      formData.append(
        "avatar",
        new File([new Uint8Array(64)], "a.webp", { type: "image/webp" }),
      );

      const result = await gateway.uploadAvatar(formData);

      expect(mockApiFetch).toHaveBeenCalledWith("/account/avatar/", {
        method: "POST",
        body: formData,
      });
      expect(result).toEqual({ avatarUrl: "https://cdn/avatar.webp" });
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 400: Bad Request"));

      await expect(gateway.uploadAvatar(new FormData())).rejects.toThrow(
        "API 400: Bad Request",
      );
    });
  });

  describe("deleteAvatar", () => {
    it("sends DELETE /account/avatar/ via apiFetchVoid", async () => {
      mockApiFetchVoid.mockResolvedValue(undefined);

      await gateway.deleteAvatar();

      expect(mockApiFetchVoid).toHaveBeenCalledWith("/account/avatar/", {
        method: "DELETE",
      });
    });

    it("propagates errors from apiFetchVoid", async () => {
      mockApiFetchVoid.mockRejectedValue(new Error("API 404: Not Found"));

      await expect(gateway.deleteAvatar()).rejects.toThrow(
        "API 404: Not Found",
      );
    });
  });
});
