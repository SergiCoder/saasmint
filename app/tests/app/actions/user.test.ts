import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const mockGetCurrentUser = vi.fn();
const mockDeleteAccount = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  authGateway: {
    getCurrentUser: mockGetCurrentUser,
    deleteAccount: mockDeleteAccount,
  },
  userGateway: { updateProfile: mockUpdateProfile },
}));

const mockUser = {
  id: "user_123",
  email: "user@example.com",
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
  mockGetCurrentUser.mockResolvedValue(mockUser);
  const mod = await import("@/app/actions/user");
  updateProfile = mod.updateProfile;
  updateAvatarUrl = mod.updateAvatarUrl;
  deleteAccount = mod.deleteAccount;
  updatePreferredLocale = mod.updatePreferredLocale;
});

describe("user server actions", () => {
  describe("updateProfile", () => {
    it("updates profile and revalidates /profile", async () => {
      mockUpdateProfile.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("preferredLocale", "fr");
      formData.set("preferredCurrency", "eur");

      const result = await updateProfile(undefined, formData);
      expect(mockGetCurrentUser).toHaveBeenCalledOnce();
      expect(mockUpdateProfile).toHaveBeenCalledWith({
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
      expect(result).toEqual({ ok: true });
    });

    it("rejects fullName outside 3-255 chars", async () => {
      for (const name of ["", "Ab", "A".repeat(256)]) {
        const formData = new FormData();
        formData.set("fullName", name);
        const result = await updateProfile(undefined, formData);
        expect(result).toEqual({ ok: false, code: "full_name_invalid" });
      }
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it("updates profile with custom fields", async () => {
      mockUpdateProfile.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("phonePrefix", "+34");
      formData.set("phone", "612345678");
      formData.set("timezone", "Europe/Madrid");
      formData.set("jobTitle", "Engineer");
      formData.set("pronouns", "she/her");
      formData.set("bio", "Hello world");

      const result = await updateProfile(undefined, formData);
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        fullName: "Jane Doe",
        phonePrefix: "+34",
        phone: "612345678",
        timezone: "Europe/Madrid",
        jobTitle: "Engineer",
        pronouns: "she/her",
        bio: "Hello world",
      });
      expect(result).toEqual({ ok: true });
    });

    it("sends null for empty custom fields and omits locale/currency when missing", async () => {
      mockUpdateProfile.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("fullName", "Jane");
      formData.set("phone", "");
      formData.set("timezone", "");
      formData.set("jobTitle", "");
      formData.set("bio", "");

      const result = await updateProfile(undefined, formData);
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        fullName: "Jane",
        phonePrefix: null,
        phone: null,
        timezone: null,
        jobTitle: null,
        pronouns: null,
        bio: null,
      });
      expect(result).toEqual({ ok: true });
    });

    it("returns an envelope error when gateway throws", async () => {
      mockUpdateProfile.mockRejectedValue(new Error("Server error"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");

      const result = await updateProfile(undefined, formData);
      expect(result).toEqual({ ok: false, code: "unknown_error" });
      errSpy.mockRestore();
    });

    it("returns fieldErrors for phone mismatch / too short", async () => {
      const prefixOnly = new FormData();
      prefixOnly.set("fullName", "Jane Doe");
      prefixOnly.set("phonePrefix", "+34");
      expect(await updateProfile(undefined, prefixOnly)).toEqual({
        ok: false,
        code: "invalid_input",
        fieldErrors: { phone: "phoneNumberRequired" },
      });

      const phoneOnly = new FormData();
      phoneOnly.set("fullName", "Jane Doe");
      phoneOnly.set("phone", "612345678");
      expect(await updateProfile(undefined, phoneOnly)).toEqual({
        ok: false,
        code: "invalid_input",
        fieldErrors: { phone: "phonePrefixRequired" },
      });

      const tooShort = new FormData();
      tooShort.set("fullName", "Jane Doe");
      tooShort.set("phonePrefix", "+34");
      tooShort.set("phone", "123");
      expect(await updateProfile(undefined, tooShort)).toEqual({
        ok: false,
        code: "invalid_input",
        fieldErrors: { phone: "phoneTooShort" },
      });

      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it("returns session_expired when getCurrentUser throws AuthError", async () => {
      const { AuthError } = await import("@/domain/errors/AuthError");
      mockGetCurrentUser.mockRejectedValue(
        new AuthError("No active session", "NO_SESSION"),
      );

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");

      const result = await updateProfile(undefined, formData);
      expect(result).toEqual({ ok: false, code: "session_expired" });
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
  });

  describe("updateAvatarUrl", () => {
    it("updates avatar URL and revalidates /", async () => {
      mockUpdateProfile.mockResolvedValue(undefined);

      await updateAvatarUrl("https://example.com/avatar.webp");

      expect(mockGetCurrentUser).toHaveBeenCalledOnce();
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        avatarUrl: "https://example.com/avatar.webp",
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("sends null to clear avatar", async () => {
      mockUpdateProfile.mockResolvedValue(undefined);

      await updateAvatarUrl(null);

      expect(mockUpdateProfile).toHaveBeenCalledWith({ avatarUrl: null });
    });

    it("returns session_expired when getCurrentUser throws AuthError", async () => {
      const { AuthError } = await import("@/domain/errors/AuthError");
      mockGetCurrentUser.mockRejectedValue(
        new AuthError("No active session", "NO_SESSION"),
      );

      const result = await updateAvatarUrl("https://example.com/avatar.webp");
      expect(result).toEqual({ ok: false, code: "session_expired" });
    });

    it("returns unknown_error for a generic non-auth failure", async () => {
      mockUpdateProfile.mockRejectedValue(new Error("Server error"));

      const result = await updateAvatarUrl("https://example.com/avatar.webp");
      expect(result).toEqual({ ok: false, code: "unknown_error" });
    });

    it("forwards ApiError code and Django detail from the gateway", async () => {
      const { ApiError } = await import("@/domain/errors/ApiError");
      mockUpdateProfile.mockRejectedValue(
        new ApiError(413, {
          detail: "Image too large.",
          code: "image_too_large",
        }),
      );

      const result = await updateAvatarUrl("https://example.com/avatar.webp");
      expect(result).toEqual({
        ok: false,
        code: "image_too_large",
        message: "Image too large.",
      });
    });
  });

  describe("updatePreferredLocale", () => {
    it("updates the current user's preferred locale", async () => {
      mockUpdateProfile.mockResolvedValue(undefined);

      await updatePreferredLocale("fr");

      expect(mockUpdateProfile).toHaveBeenCalledWith({ preferredLocale: "fr" });
    });

    it("silently ignores errors", async () => {
      mockUpdateProfile.mockRejectedValue(new Error("API 500"));

      await expect(updatePreferredLocale("fr")).resolves.toBeUndefined();
    });
  });

  describe("deleteAccount", () => {
    it("deletes account and returns ok", async () => {
      mockDeleteAccount.mockResolvedValue(undefined);

      const result = await deleteAccount();

      expect(mockDeleteAccount).toHaveBeenCalledOnce();
      expect(result).toEqual({ ok: true });
    });

    it("returns unknown_error for a generic failure", async () => {
      mockDeleteAccount.mockRejectedValue(new Error("Server error"));

      const result = await deleteAccount();

      expect(result).toEqual({ ok: false, code: "unknown_error" });
    });

    it("forwards ApiError code and Django detail from the gateway", async () => {
      const { ApiError } = await import("@/domain/errors/ApiError");
      mockDeleteAccount.mockRejectedValue(
        new ApiError(409, {
          detail: "Cannot delete: you are the sole owner of an active org.",
          code: "sole_owner",
        }),
      );

      const result = await deleteAccount();

      expect(result).toEqual({
        ok: false,
        code: "sole_owner",
        message: "Cannot delete: you are the sole owner of an active org.",
      });
    });

    it("returns session_expired when the gateway throws AuthError", async () => {
      const { AuthError } = await import("@/domain/errors/AuthError");
      mockDeleteAccount.mockRejectedValue(
        new AuthError("No active session", "NO_SESSION"),
      );

      const result = await deleteAccount();

      expect(result).toEqual({ ok: false, code: "session_expired" });
    });
  });
});
