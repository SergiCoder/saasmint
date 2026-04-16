import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockAcceptInvitationExecute = vi.fn();
vi.mock("@/application/use-cases/invitation/AcceptInvitation", () => ({
  AcceptInvitation: function AcceptInvitation() {
    return { execute: mockAcceptInvitationExecute };
  },
}));

const mockDeclineInvitationExecute = vi.fn();
vi.mock("@/application/use-cases/invitation/DeclineInvitation", () => ({
  DeclineInvitation: function DeclineInvitation() {
    return { execute: mockDeclineInvitationExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  invitationGateway: {},
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
      mockAcceptInvitationExecute.mockResolvedValue({
        accessToken: "at",
        refreshToken: "rt",
      });

      const formData = new FormData();
      formData.set("token", "abc123");
      formData.set("fullName", "Bob Smith");
      formData.set("password", "secret123");

      await expect(acceptInvitation(null, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockAcceptInvitationExecute).toHaveBeenCalledWith("abc123", {
        fullName: "Bob Smith",
        password: "secret123",
      });
      expect(mockSetAuthCookies).toHaveBeenCalledWith("at", "rt");
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("returns error when required fields are missing", async () => {
      const formData = new FormData();
      formData.set("token", "abc123");

      const result = await acceptInvitation(null, formData);
      expect(result).toEqual({ error: "Missing required fields" });
      expect(mockAcceptInvitationExecute).not.toHaveBeenCalled();
    });
  });

  describe("declineInvitation", () => {
    it("declines invitation and redirects to /dashboard", async () => {
      mockDeclineInvitationExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("token", "abc123");

      await expect(declineInvitation(formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockDeclineInvitationExecute).toHaveBeenCalledWith("abc123");
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("returns early when token is missing", async () => {
      const formData = new FormData();

      await declineInvitation(formData);
      expect(mockDeclineInvitationExecute).not.toHaveBeenCalled();
    });
  });
});
