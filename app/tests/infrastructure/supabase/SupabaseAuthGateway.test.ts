import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/domain/errors/AuthError";
import type { User } from "@/domain/models/User";

const mockSignOut = vi.fn();

vi.mock("@/infrastructure/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { SupabaseAuthGateway } =
  await import("@/infrastructure/supabase/SupabaseAuthGateway");

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

const camelUser: User = {
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

describe("SupabaseAuthGateway", () => {
  const gateway = new SupabaseAuthGateway();

  describe("getCurrentUser", () => {
    it("returns user from API with keys converted to camelCase", async () => {
      mockApiFetch.mockResolvedValue(snakeUser);

      const result = await gateway.getCurrentUser();

      expect(mockApiFetch).toHaveBeenCalledWith("/account/");
      expect(result).toEqual(camelUser);
    });

    it("propagates apiFetch errors", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.getCurrentUser()).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });

  describe("signOut", () => {
    it("calls supabase signOut successfully", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await gateway.signOut();

      expect(mockSignOut).toHaveBeenCalledOnce();
    });

    it("throws AuthError with SIGN_OUT_FAILED when signOut errors", async () => {
      mockSignOut.mockResolvedValue({
        error: { message: "Session expired" },
      });

      await expect(gateway.signOut()).rejects.toThrow(AuthError);
      await expect(gateway.signOut()).rejects.toMatchObject({
        code: "SIGN_OUT_FAILED",
        message: "Session expired",
      });
    });
  });

  describe("deleteAccount", () => {
    it("calls DELETE /account/ and signs out", async () => {
      mockApiFetch.mockResolvedValue(undefined);
      mockSignOut.mockResolvedValue({ error: null });

      await gateway.deleteAccount();

      expect(mockApiFetch).toHaveBeenCalledWith("/account/", {
        method: "DELETE",
      });
      expect(mockSignOut).toHaveBeenCalledOnce();
    });

    it("propagates apiFetch errors", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 403: Forbidden"));

      await expect(gateway.deleteAccount()).rejects.toThrow(
        "API 403: Forbidden",
      );
    });
  });
});
