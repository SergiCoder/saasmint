import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

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

const mockDeleteAccountExecute = vi.fn();
vi.mock("@/application/use-cases/auth/DeleteAccount", () => ({
  DeleteAccount: function DeleteAccount() {
    return { execute: mockDeleteAccountExecute };
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
  phonePrefix: null,
  phone: null,
  timezone: null,
  jobTitle: null,
  pronouns: null,
  bio: null,
};

let updateProfile: typeof import("@/app/actions/user").updateProfile;
let updateAvatarUrl: typeof import("@/app/actions/user").updateAvatarUrl;
let deleteAccount: typeof import("@/app/actions/user").deleteAccount;

beforeEach(async () => {
  vi.clearAllMocks();
  mockGetCurrentUserExecute.mockResolvedValue(mockUser);
  const mod = await import("@/app/actions/user");
  updateProfile = mod.updateProfile;
  updateAvatarUrl = mod.updateAvatarUrl;
  deleteAccount = mod.deleteAccount;
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
        avatarUrl: null,
        preferredLocale: "fr",
        preferredCurrency: "eur",
        phonePrefix: null,
        phone: null,
        timezone: null,
        jobTitle: null,
        pronouns: null,
        bio: null,
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/settings");
      expect(result).toEqual({ success: true });
    });

    it("rejects empty fullName", async () => {
      const formData = new FormData();
      formData.set("fullName", "");

      const result = await updateProfile(undefined, formData);
      expect(result).toEqual({
        error: "Full name must be between 3 and 255 characters",
      });
      expect(mockUpdateUserProfileExecute).not.toHaveBeenCalled();
    });

    it("rejects fullName shorter than 3 characters", async () => {
      const formData = new FormData();
      formData.set("fullName", "Ab");

      const result = await updateProfile(undefined, formData);
      expect(result).toEqual({
        error: "Full name must be between 3 and 255 characters",
      });
      expect(mockUpdateUserProfileExecute).not.toHaveBeenCalled();
    });

    it("rejects fullName longer than 255 characters", async () => {
      const formData = new FormData();
      formData.set("fullName", "A".repeat(256));

      const result = await updateProfile(undefined, formData);
      expect(result).toEqual({
        error: "Full name must be between 3 and 255 characters",
      });
      expect(mockUpdateUserProfileExecute).not.toHaveBeenCalled();
    });

    it("updates profile with new custom fields", async () => {
      mockUpdateUserProfileExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("phone", "+1234567890");
      formData.set("timezone", "Europe/Madrid");
      formData.set("jobTitle", "Engineer");
      formData.set("pronouns", "she/her");
      formData.set("bio", "Hello world");

      const result = await updateProfile(undefined, formData);
      expect(mockUpdateUserProfileExecute).toHaveBeenCalledWith("user_123", {
        fullName: "Jane Doe",
        avatarUrl: null,
        phonePrefix: null,
        phone: "+1234567890",
        timezone: "Europe/Madrid",
        jobTitle: "Engineer",
        pronouns: "she/her",
        bio: "Hello world",
      });
      expect(result).toEqual({ success: true });
    });

    it("sends null for empty custom fields", async () => {
      mockUpdateUserProfileExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("fullName", "Jane");
      formData.set("phone", "");
      formData.set("timezone", "");
      formData.set("jobTitle", "");
      formData.set("bio", "");

      const result = await updateProfile(undefined, formData);
      expect(mockUpdateUserProfileExecute).toHaveBeenCalledWith("user_123", {
        fullName: "Jane",
        avatarUrl: null,
        phonePrefix: null,
        phone: null,
        timezone: null,
        jobTitle: null,
        pronouns: null,
        bio: null,
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
        avatarUrl: null,
        phonePrefix: null,
        phone: null,
        timezone: null,
        jobTitle: null,
        pronouns: null,
        bio: null,
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

  describe("updateAvatarUrl", () => {
    it("updates avatar URL and revalidates /settings", async () => {
      mockUpdateUserProfileExecute.mockResolvedValue(undefined);

      await updateAvatarUrl("https://example.com/avatar.webp");

      expect(mockGetCurrentUserExecute).toHaveBeenCalledOnce();
      expect(mockUpdateUserProfileExecute).toHaveBeenCalledWith("user_123", {
        avatarUrl: "https://example.com/avatar.webp",
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("sends null to clear avatar", async () => {
      mockUpdateUserProfileExecute.mockResolvedValue(undefined);

      await updateAvatarUrl(null);

      expect(mockUpdateUserProfileExecute).toHaveBeenCalledWith("user_123", {
        avatarUrl: null,
      });
    });
  });

  describe("deleteAccount", () => {
    it("deletes account and returns success", async () => {
      mockDeleteAccountExecute.mockResolvedValue(undefined);

      const result = await deleteAccount();

      expect(mockDeleteAccountExecute).toHaveBeenCalledOnce();
      expect(result).toEqual({ success: true });
    });

    it("returns error on failure", async () => {
      mockDeleteAccountExecute.mockRejectedValue(new Error("Server error"));

      const result = await deleteAccount();

      expect(result).toEqual({ error: "Failed to delete account" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });
});
