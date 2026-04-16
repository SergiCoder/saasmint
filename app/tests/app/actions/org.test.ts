import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const mockCreateInvitationExecute = vi.fn();
vi.mock("@/application/use-cases/invitation/CreateInvitation", () => ({
  CreateInvitation: function CreateInvitation() {
    return { execute: mockCreateInvitationExecute };
  },
}));

const mockCancelInvitationExecute = vi.fn();
vi.mock("@/application/use-cases/invitation/CancelInvitation", () => ({
  CancelInvitation: function CancelInvitation() {
    return { execute: mockCancelInvitationExecute };
  },
}));

const mockRemoveOrgMemberExecute = vi.fn();
vi.mock("@/application/use-cases/org-member/RemoveOrgMember", () => ({
  RemoveOrgMember: function RemoveOrgMember() {
    return { execute: mockRemoveOrgMemberExecute };
  },
}));

const mockTransferOwnershipExecute = vi.fn();
vi.mock("@/application/use-cases/org-member/TransferOwnership", () => ({
  TransferOwnership: function TransferOwnership() {
    return { execute: mockTransferOwnershipExecute };
  },
}));

const mockDeleteOrgExecute = vi.fn();
vi.mock("@/application/use-cases/org/DeleteOrg", () => ({
  DeleteOrg: function DeleteOrg() {
    return { execute: mockDeleteOrgExecute };
  },
}));

const mockGetCurrentUserExecute = vi.fn();
vi.mock("@/application/use-cases/auth/GetCurrentUser", () => ({
  GetCurrentUser: function GetCurrentUser() {
    return { execute: mockGetCurrentUserExecute };
  },
}));

const mockListOrgMembersExecute = vi.fn();
vi.mock("@/application/use-cases/org-member/ListOrgMembers", () => ({
  ListOrgMembers: function ListOrgMembers() {
    return { execute: mockListOrgMembersExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  authGateway: {},
  orgGateway: {},
  orgMemberGateway: {},
  invitationGateway: {},
}));

let inviteMember: typeof import("@/app/actions/org").inviteMember;
let cancelInvitation: typeof import("@/app/actions/org").cancelInvitation;
let removeMember: typeof import("@/app/actions/org").removeMember;
let transferOwnership: typeof import("@/app/actions/org").transferOwnership;
let deleteOrg: typeof import("@/app/actions/org").deleteOrg;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/org");
  inviteMember = mod.inviteMember;
  cancelInvitation = mod.cancelInvitation;
  removeMember = mod.removeMember;
  transferOwnership = mod.transferOwnership;
  deleteOrg = mod.deleteOrg;
});

describe("org server actions", () => {
  describe("inviteMember", () => {
    it("creates invitation and revalidates path", async () => {
      mockCreateInvitationExecute.mockResolvedValue({});

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("email", "bob@example.com");
      formData.set("role", "member");

      const result = await inviteMember(undefined, formData);
      expect(mockCreateInvitationExecute).toHaveBeenCalledWith("org_1", {
        email: "bob@example.com",
        role: "member",
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org");
      expect(result).toEqual({ ok: true });
    });

    it("returns error on failure", async () => {
      mockCreateInvitationExecute.mockRejectedValue(new Error("Seat limit"));

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("email", "bob@example.com");
      formData.set("role", "admin");

      const result = await inviteMember(undefined, formData);
      expect(result).toEqual({ ok: false, error: "Failed to send invitation" });
    });

    it("returns error for invalid role", async () => {
      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("email", "bob@example.com");
      formData.set("role", "owner");

      const result = await inviteMember(undefined, formData);
      expect(result).toEqual({ ok: false, error: "Invalid input" });
      expect(mockCreateInvitationExecute).not.toHaveBeenCalled();
    });

    it("returns error when required fields are missing", async () => {
      const formData = new FormData();

      const result = await inviteMember(undefined, formData);
      expect(result).toEqual({ ok: false, error: "Invalid input" });
    });
  });

  describe("cancelInvitation", () => {
    it("cancels invitation and revalidates path", async () => {
      mockCancelInvitationExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("invitationId", "inv_1");

      await cancelInvitation(formData);
      expect(mockCancelInvitationExecute).toHaveBeenCalledWith(
        "org_1",
        "inv_1",
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org");
    });

    it("returns early when orgId is missing", async () => {
      const formData = new FormData();
      formData.set("invitationId", "inv_1");

      await cancelInvitation(formData);
      expect(mockCancelInvitationExecute).not.toHaveBeenCalled();
    });
  });

  describe("removeMember", () => {
    it("removes member and revalidates path", async () => {
      mockRemoveOrgMemberExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");

      await removeMember(formData);
      expect(mockRemoveOrgMemberExecute).toHaveBeenCalledWith(
        "org_1",
        "user_123",
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org");
    });

    it("returns early when orgId is missing", async () => {
      const formData = new FormData();
      formData.set("userId", "user_123");

      await removeMember(formData);
      expect(mockRemoveOrgMemberExecute).not.toHaveBeenCalled();
    });
  });

  describe("transferOwnership", () => {
    it("transfers ownership and revalidates path", async () => {
      mockTransferOwnershipExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_2");

      const result = await transferOwnership(undefined, formData);
      expect(mockTransferOwnershipExecute).toHaveBeenCalledWith(
        "org_1",
        "user_2",
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org");
      expect(result).toEqual({ ok: true });
    });

    it("returns error on failure", async () => {
      mockTransferOwnershipExecute.mockRejectedValue(new Error("Not an admin"));

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_2");

      const result = await transferOwnership(undefined, formData);
      expect(result).toEqual({
        ok: false,
        error: "Failed to transfer ownership",
      });
    });
  });

  describe("deleteOrg", () => {
    it("deletes org and redirects to dashboard when user is owner", async () => {
      mockGetCurrentUserExecute.mockResolvedValue({ id: "user_owner" });
      mockListOrgMembersExecute.mockResolvedValue([
        { user: { id: "user_owner" }, role: "owner" },
      ]);
      mockDeleteOrgExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");

      await expect(deleteOrg(formData)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockDeleteOrgExecute).toHaveBeenCalledWith("org_1");
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("returns early when user is not owner", async () => {
      mockGetCurrentUserExecute.mockResolvedValue({ id: "user_member" });
      mockListOrgMembersExecute.mockResolvedValue([
        { user: { id: "user_owner" }, role: "owner" },
        { user: { id: "user_member" }, role: "member" },
      ]);

      const formData = new FormData();
      formData.set("orgId", "org_1");

      await deleteOrg(formData);
      expect(mockDeleteOrgExecute).not.toHaveBeenCalled();
    });

    it("returns early when orgId is missing", async () => {
      const formData = new FormData();

      await deleteOrg(formData);
      expect(mockDeleteOrgExecute).not.toHaveBeenCalled();
    });
  });
});
