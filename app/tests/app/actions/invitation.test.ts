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
    it("accepts invitation and redirects to /login?invited=true", async () => {
      // Backend creates the user as unverified and emails a verification
      // link instead of issuing tokens — the gateway resolves to void.
      mockAccept.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("token", "abc123");
      formData.set("fullName", "Bob Smith");
      formData.set("password", "secret1234");

      await expect(acceptInvitation(null, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockAccept).toHaveBeenCalledWith("abc123", {
        fullName: "Bob Smith",
        password: "secret1234",
      });
      expect(mockRedirect).toHaveBeenCalledWith("/login?invited=true");
    });

    it("returns invalid_input when required fields are missing", async () => {
      const formData = new FormData();
      formData.set("token", "abc123");

      const result = await acceptInvitation(null, formData);
      expect(result).toEqual({ ok: false, code: "invalid_input" });
      expect(mockAccept).not.toHaveBeenCalled();
    });

    it("returns full_name_invalid when fullName is shorter than 3 characters", async () => {
      const formData = new FormData();
      formData.set("token", "abc123");
      formData.set("fullName", "Bo");
      formData.set("password", "secret1234");

      const result = await acceptInvitation(null, formData);
      expect(result).toEqual({ ok: false, code: "full_name_invalid" });
      expect(mockAccept).not.toHaveBeenCalled();
    });

    it("returns full_name_invalid when fullName exceeds 255 characters", async () => {
      const formData = new FormData();
      formData.set("token", "abc123");
      formData.set("fullName", "a".repeat(256));
      formData.set("password", "secret1234");

      const result = await acceptInvitation(null, formData);
      expect(result).toEqual({ ok: false, code: "full_name_invalid" });
      expect(mockAccept).not.toHaveBeenCalled();
    });

    it("returns password_too_short when the password is below PASSWORD_MIN_LENGTH", async () => {
      const formData = new FormData();
      formData.set("token", "abc123");
      formData.set("fullName", "Bob Smith");
      formData.set("password", "short1"); // 6 chars, below the 10-char minimum

      const result = await acceptInvitation(null, formData);
      expect(result).toEqual({ ok: false, code: "password_too_short" });
      expect(mockAccept).not.toHaveBeenCalled();
    });

    it("returns an envelope error and does not redirect when gateway throws", async () => {
      mockAccept.mockRejectedValue(new Error("token expired"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const formData = new FormData();
      formData.set("token", "abc123");
      formData.set("fullName", "Bob Smith");
      formData.set("password", "secret1234");

      const result = await acceptInvitation(null, formData);
      expect(result).toEqual({ ok: false, code: "unknown_error" });
      expect(mockRedirect).not.toHaveBeenCalled();
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
