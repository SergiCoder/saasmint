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
});

describe("SupabaseAuthGateway", () => {
  const gateway = new SupabaseAuthGateway();

  describe("getCurrentUser", () => {
    it("returns user from API via apiFetch", async () => {
      mockApiFetch.mockResolvedValue(user);

      const result = await gateway.getCurrentUser();

      expect(mockApiFetch).toHaveBeenCalledWith("/account/");
      expect(result).toEqual(user);
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
});
