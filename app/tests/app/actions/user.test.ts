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
let updatePreferredLocale: typeof import("@/app/actions/user").updatePreferredLocale;

beforeEach(async () => {
  vi.clearAllMocks();
  mockGetCurrentUserExecute.mockResolvedValue(mockUser);
  const mod = await import("@/app/actions/user");
  updateProfile = mod.updateProfile;
  updateAvatarUrl = mod.updateAvatarUrl;
  deleteAccount = mod.deleteAccount;
  updatePreferredLocale = mod.updatePreferredLocale;
});

describe("user server actions", () => {
  describe("updateProfile", () => {
    it("updates profile and revalidates /profile", async () => {
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
        phonePrefix: null,
        phone: null,
        timezone: null,
        jobTitle: null,
        pronouns: null,
        bio: null,
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/profile");
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
      formData.set("phonePrefix", "+34");
      formData.set("phone", "612345678");
      formData.set("timezone", "Europe/Madrid");
      formData.set("jobTitle", "Engineer");
      formData.set("pronouns", "she/her");
      formData.set("bio", "Hello world");

      const result = await updateProfile(undefined, formData);
      expect(mockUpdateUserProfileExecute).toHaveBeenCalledWith("user_123", {
        fullName: "Jane Doe",

        phonePrefix: "+34",
        phone: "612345678",
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

    it("returns fieldErrors when phone prefix is set but number is missing", async () => {
      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("phonePrefix", "+34");

      const result = await updateProfile(undefined, formData);
      expect(result).toEqual({
        fieldErrors: { phone: "phoneNumberRequired" },
      });
      expect(mockUpdateUserProfileExecute).not.toHaveBeenCalled();
    });

    it("returns fieldErrors when phone number is set but prefix is missing", async () => {
      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("phone", "612345678");

      const result = await updateProfile(undefined, formData);
      expect(result).toEqual({
        fieldErrors: { phone: "phonePrefixRequired" },
      });
      expect(mockUpdateUserProfileExecute).not.toHaveBeenCalled();
    });

    it("returns fieldErrors when phone number is too short", async () => {
      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("phonePrefix", "+34");
      formData.set("phone", "123");

      const result = await updateProfile(undefined, formData);
      expect(result).toEqual({
        fieldErrors: { phone: "phoneTooShort" },
      });
      expect(mockUpdateUserProfileExecute).not.toHaveBeenCalled();
    });

    it("returns session expired error when GetCurrentUser throws AuthError", async () => {
      const { AuthError } = await import("@/domain/errors/AuthError");
      mockGetCurrentUserExecute.mockRejectedValue(
        new AuthError("No active session", "NO_SESSION"),
      );

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");

      const result = await updateProfile(undefined, formData);
      expect(result).toEqual({
        error: "Session expired. Please log in again.",
      });
      expect(mockUpdateUserProfileExecute).not.toHaveBeenCalled();
    });
  });

  describe("updateAvatarUrl", () => {
    it("updates avatar URL and revalidates /profile", async () => {
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

    it("returns session expired error when GetCurrentUser throws AuthError", async () => {
      const { AuthError } = await import("@/domain/errors/AuthError");
      mockGetCurrentUserExecute.mockRejectedValue(
        new AuthError("No active session", "NO_SESSION"),
      );

      const result = await updateAvatarUrl("https://example.com/avatar.webp");
      expect(result).toEqual({
        error: "Session expired. Please log in again.",
      });
    });

    it("returns generic error on non-auth failure", async () => {
      mockUpdateUserProfileExecute.mockRejectedValue(new Error("Server error"));

      const result = await updateAvatarUrl("https://example.com/avatar.webp");
      expect(result).toEqual({ error: "Failed to update avatar" });
    });
  });

  describe("updatePreferredLocale", () => {
    it("updates the current user's preferred locale", async () => {
      mockUpdateUserProfileExecute.mockResolvedValue(undefined);

      await updatePreferredLocale("fr");

      expect(mockGetCurrentUserExecute).toHaveBeenCalledOnce();
      expect(mockUpdateUserProfileExecute).toHaveBeenCalledWith("user_123", {
        preferredLocale: "fr",
      });
    });

    it("silently ignores errors from GetCurrentUser", async () => {
      mockGetCurrentUserExecute.mockRejectedValue(new Error("No session"));

      await expect(updatePreferredLocale("fr")).resolves.toBeUndefined();
      expect(mockUpdateUserProfileExecute).not.toHaveBeenCalled();
    });

    it("silently ignores errors from UpdateUserProfile", async () => {
      mockUpdateUserProfileExecute.mockRejectedValue(new Error("API 500"));

      await expect(updatePreferredLocale("fr")).resolves.toBeUndefined();
    });
  });

  describe("deleteAccount", () => {
    it("deletes account and returns success", async () => {
      mockDeleteAccountExecute.mockResolvedValue({
        scheduledDeletionAt: null,
      });

      const result = await deleteAccount();

      expect(mockDeleteAccountExecute).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: true,
        scheduledDeletionAt: null,
      });
    });

    it("returns error on failure", async () => {
      mockDeleteAccountExecute.mockRejectedValue(new Error("Server error"));

      const result = await deleteAccount();

      expect(result).toEqual({ error: "Failed to delete account" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });
});
