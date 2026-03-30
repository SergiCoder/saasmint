import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";

const mockGetAuthToken = vi.fn().mockResolvedValue("tok_test");
const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { DjangoApiUserGateway } =
  await import("@/infrastructure/api/DjangoApiUserGateway");

const user: User = {
  id: "u1",
  supabaseUid: "sb-u1",
  email: "alice@example.com",
  fullName: "Alice",
  avatarUrl: null,
  accountType: "personal",
  preferredLocale: "en",
  preferredCurrency: "USD",
  isVerified: true,
  createdAt: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthToken.mockResolvedValue("tok_test");
});

describe("DjangoApiUserGateway", () => {
  const gateway = new DjangoApiUserGateway();

  describe("getProfile", () => {
    it("fetches the user profile with GET /account/", async () => {
      mockApiFetch.mockResolvedValue(user);

      const result = await gateway.getProfile("u1");

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith("/account/", "tok_test");
      expect(result).toEqual(user);
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.getProfile("u1")).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });

  describe("updateProfile", () => {
    it("sends PATCH /account/ with input body", async () => {
      const updated = { ...user, fullName: "Alice Smith" };
      mockApiFetch.mockResolvedValue(updated);

      const input = { fullName: "Alice Smith" };
      const result = await gateway.updateProfile("u1", input);

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith("/account/", "tok_test", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      expect(result).toEqual(updated);
    });

    it("propagates auth token errors", async () => {
      mockGetAuthToken.mockRejectedValue(new Error("No active session"));

      await expect(
        gateway.updateProfile("u1", { fullName: "Alice" }),
      ).rejects.toThrow("No active session");
    });
  });
});
