import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const mockGetCurrentUserExecute = vi.fn();
vi.mock("@/application/use-cases/auth/GetCurrentUser", () => ({
  GetCurrentUser: function GetCurrentUser() {
    return { execute: mockGetCurrentUserExecute };
  },
}));

const mockUpdateUserProfileExecute = vi.fn();
vi.mock("@/application/use-cases/user/UpdateUserProfile", () => ({
  UpdateUserProfile: function UpdateUserProfile() {
    return { execute: mockUpdateUserProfileExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  authGateway: {},
  userGateway: {},
}));

const mockUser = {
  id: "user_123",
  email: "user@example.com",
  accountType: "personal" as const,
  fullName: "John Doe",
  preferredLocale: "en",
  preferredCurrency: "usd",
};

let updateProfile: typeof import("@/app/actions/user").updateProfile;

beforeEach(async () => {
  vi.clearAllMocks();
  mockGetCurrentUserExecute.mockResolvedValue(mockUser);
  const mod = await import("@/app/actions/user");
  updateProfile = mod.updateProfile;
});

describe("user server actions", () => {
  describe("updateProfile", () => {
    it("updates profile and revalidates /settings", async () => {
      mockUpdateUserProfileExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("preferredLocale", "fr");
      formData.set("preferredCurrency", "eur");

      const result = await updateProfile(undefined, formData);
      expect(mockGetCurrentUserExecute).toHaveBeenCalledOnce();
      expect(mockUpdateUserProfileExecute).toHaveBeenCalledWith("user_123", {
        fullName: "Jane Doe",
        preferredLocale: "fr",
        preferredCurrency: "eur",
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/settings");
      expect(result).toEqual({ success: true });
    });

    it("sends null for empty fullName", async () => {
      mockUpdateUserProfileExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("fullName", "");

      const result = await updateProfile(undefined, formData);
      expect(mockUpdateUserProfileExecute).toHaveBeenCalledWith("user_123", {
        fullName: null,
      });
      expect(result).toEqual({ success: true });
    });

    it("omits locale and currency when not provided", async () => {
      mockUpdateUserProfileExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("fullName", "Jane");

      const result = await updateProfile(undefined, formData);
      expect(mockUpdateUserProfileExecute).toHaveBeenCalledWith("user_123", {
        fullName: "Jane",
      });
      expect(result).toEqual({ success: true });
    });

    it("returns error on failure", async () => {
      mockUpdateUserProfileExecute.mockRejectedValue(new Error("Server error"));

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");

      const result = await updateProfile(undefined, formData);
      expect(result).toEqual({ error: "Failed to update profile" });
    });
  });
});
