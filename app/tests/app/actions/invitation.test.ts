import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockAccept = vi.fn();
const mockDecline = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  invitationGateway: {
    acceptInvitation: (...args: unknown[]) => mockAccept(...args),
    declineInvitation: (...args: unknown[]) => mockDecline(...args),
  },
}));

const mockSetAuthCookies = vi.fn();
vi.mock("@/infrastructure/auth/cookies", () => ({
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
}));

let acceptInvitation: typeof import("@/app/actions/invitation").acceptInvitation;
let declineInvitation: typeof import("@/app/actions/invitation").declineInvitation;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/invitation");
  acceptInvitation = mod.acceptInvitation;
  declineInvitation = mod.declineInvitation;
});

describe("invitation server actions", () => {
  describe("acceptInvitation", () => {
    it("accepts invitation, sets cookies, and redirects to /dashboard", async () => {
      mockAccept.mockResolvedValue({ accessToken: "at", refreshToken: "rt" });

      const formData = new FormData();
      formData.set("token", "abc123");
      formData.set("fullName", "Bob Smith");
      formData.set("password", "secret123");

      await expect(acceptInvitation(null, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockAccept).toHaveBeenCalledWith("abc123", {
        fullName: "Bob Smith",
        password: "secret123",
      });
      expect(mockSetAuthCookies).toHaveBeenCalledWith("at", "rt");
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("returns invalid_input when required fields are missing", async () => {
      const formData = new FormData();
      formData.set("token", "abc123");

      const result = await acceptInvitation(null, formData);
      expect(result).toEqual({ ok: false, code: "invalid_input" });
      expect(mockAccept).not.toHaveBeenCalled();
    });

    it("returns an envelope error and does not set cookies when gateway throws", async () => {
      mockAccept.mockRejectedValue(new Error("token expired"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const formData = new FormData();
      formData.set("token", "abc123");
      formData.set("fullName", "Bob Smith");
      formData.set("password", "secret123");

      const result = await acceptInvitation(null, formData);
      expect(result).toEqual({ ok: false, code: "unknown_error" });
      expect(mockSetAuthCookies).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("declineInvitation", () => {
    it("declines invitation and redirects to /dashboard", async () => {
      mockDecline.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("token", "abc123");

      await expect(declineInvitation(formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockDecline).toHaveBeenCalledWith("abc123");
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("returns early when token is missing", async () => {
      const formData = new FormData();

      await declineInvitation(formData);
      expect(mockDecline).not.toHaveBeenCalled();
    });

    it("swallows errors and does not redirect when gateway throws", async () => {
      mockDecline.mockRejectedValue(new Error("API 500"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const formData = new FormData();
      formData.set("token", "abc123");

      await declineInvitation(formData);
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });
});
