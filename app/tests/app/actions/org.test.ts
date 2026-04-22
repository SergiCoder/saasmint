import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((...args: unknown[]) => {
    void args;
    throw new Error("NEXT_REDIRECT");
  }),
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const mockGetCurrentUser = vi.fn();
const mockListMembers = vi.fn();
const mockCreateInvitation = vi.fn();
const mockCancelInvitation = vi.fn();
const mockRemoveMember = vi.fn();
const mockUpdateMemberRole = vi.fn();
const mockTransferOwnership = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  authGateway: { getCurrentUser: mockGetCurrentUser },
  orgMemberGateway: {
    listMembers: mockListMembers,
    removeMember: mockRemoveMember,
    updateMemberRole: mockUpdateMemberRole,
    transferOwnership: mockTransferOwnership,
  },
  invitationGateway: {
    createInvitation: mockCreateInvitation,
    cancelInvitation: mockCancelInvitation,
  },
}));

function mockRole(role: "owner" | "admin" | "member") {
  mockGetCurrentUser.mockResolvedValue({ id: "user_me" });
  mockListMembers.mockResolvedValue([{ user: { id: "user_me" }, role }]);
}

let inviteMember: typeof import("@/app/actions/org").inviteMember;
let cancelInvitation: typeof import("@/app/actions/org").cancelInvitation;
let removeMember: typeof import("@/app/actions/org").removeMember;
let updateMemberRole: typeof import("@/app/actions/org").updateMemberRole;
let transferOwnership: typeof import("@/app/actions/org").transferOwnership;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/org");
  inviteMember = mod.inviteMember;
  cancelInvitation = mod.cancelInvitation;
  removeMember = mod.removeMember;
  updateMemberRole = mod.updateMemberRole;
  transferOwnership = mod.transferOwnership;
});

describe("org server actions", () => {
  describe("inviteMember", () => {
    it("creates invitation and revalidates path", async () => {
      mockRole("admin");
      mockCreateInvitation.mockResolvedValue({});

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("email", "bob@example.com");
      formData.set("role", "member");

      const result = await inviteMember(undefined, formData);
      expect(mockCreateInvitation).toHaveBeenCalledWith("org_1", {
        email: "bob@example.com",
        role: "member",
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org", "layout");
      expect(result).toEqual({ ok: true });
    });

    it("returns not_authorized when caller is a plain member", async () => {
      mockRole("member");

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("email", "bob@example.com");
      formData.set("role", "member");

      const result = await inviteMember(undefined, formData);
      expect(result).toEqual({ ok: false, code: "not_authorized" });
      expect(mockCreateInvitation).not.toHaveBeenCalled();
    });

    it("maps gateway errors via toActionError", async () => {
      mockRole("admin");
      mockCreateInvitation.mockRejectedValue(new Error("Seat limit"));

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("email", "bob@example.com");
      formData.set("role", "admin");

      const result = await inviteMember(undefined, formData);
      expect(result).toEqual({ ok: false, code: "unknown_error" });
    });

    it("returns invalid_input for disallowed role or missing fields", async () => {
      const invalidRole = new FormData();
      invalidRole.set("orgId", "org_1");
      invalidRole.set("email", "bob@example.com");
      invalidRole.set("role", "owner");
      expect(await inviteMember(undefined, invalidRole)).toEqual({
        ok: false,
        code: "invalid_input",
      });

      const missing = new FormData();
      expect(await inviteMember(undefined, missing)).toEqual({
        ok: false,
        code: "invalid_input",
      });

      expect(mockCreateInvitation).not.toHaveBeenCalled();
    });
  });

  describe("cancelInvitation (fire-and-forget)", () => {
    it("cancels invitation and revalidates path", async () => {
      mockRole("admin");
      mockCancelInvitation.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("invitationId", "inv_1");

      await cancelInvitation(formData);
      expect(mockCancelInvitation).toHaveBeenCalledWith("org_1", "inv_1");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org", "layout");
    });

    it("no-ops when caller is a plain member", async () => {
      mockRole("member");

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("invitationId", "inv_1");

      await cancelInvitation(formData);
      expect(mockCancelInvitation).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("returns early when orgId is missing", async () => {
      const formData = new FormData();
      formData.set("invitationId", "inv_1");

      await cancelInvitation(formData);
      expect(mockCancelInvitation).not.toHaveBeenCalled();
    });

    it("swallows errors without revalidating", async () => {
      mockRole("admin");
      mockCancelInvitation.mockRejectedValue(new Error("API 500"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("invitationId", "inv_1");

      await cancelInvitation(formData);
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("removeMember (fire-and-forget)", () => {
    it("removes member and revalidates path", async () => {
      mockRole("admin");
      mockRemoveMember.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");

      await removeMember(formData);
      expect(mockRemoveMember).toHaveBeenCalledWith("org_1", "user_123");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org", "layout");
    });

    it("no-ops when caller is a plain member", async () => {
      mockRole("member");

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");

      await removeMember(formData);
      expect(mockRemoveMember).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("swallows errors without revalidating", async () => {
      mockRole("admin");
      mockRemoveMember.mockRejectedValue(new Error("API 500"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");

      await removeMember(formData);
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("updateMemberRole (fire-and-forget)", () => {
    it("updates role and revalidates path", async () => {
      mockRole("admin");
      mockUpdateMemberRole.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");
      formData.set("role", "admin");

      await updateMemberRole(formData);
      expect(mockUpdateMemberRole).toHaveBeenCalledWith(
        "org_1",
        "user_123",
        "admin",
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org", "layout");
    });

    it("no-ops when role is not assignable", async () => {
      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");
      formData.set("role", "owner");

      await updateMemberRole(formData);
      expect(mockUpdateMemberRole).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("transferOwnership", () => {
    it("transfers ownership and revalidates path", async () => {
      mockRole("owner");
      mockTransferOwnership.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_2");

      const result = await transferOwnership(undefined, formData);
      expect(mockTransferOwnership).toHaveBeenCalledWith("org_1", "user_2");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org", "layout");
      expect(result).toEqual({ ok: true });
    });

    it("returns not_authorized when caller is only an admin", async () => {
      mockRole("admin");

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_2");

      const result = await transferOwnership(undefined, formData);
      expect(result).toEqual({ ok: false, code: "not_authorized" });
      expect(mockTransferOwnership).not.toHaveBeenCalled();
    });

    it("returns an envelope error when gateway throws", async () => {
      mockRole("owner");
      mockTransferOwnership.mockRejectedValue(new Error("Not an admin"));

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_2");

      const result = await transferOwnership(undefined, formData);
      expect(result).toEqual({ ok: false, code: "unknown_error" });
    });
  });
});
