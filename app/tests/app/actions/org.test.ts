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

const mockUpdateOrgMemberRoleExecute = vi.fn();
vi.mock("@/application/use-cases/org-member/UpdateOrgMemberRole", () => ({
  UpdateOrgMemberRole: function UpdateOrgMemberRole() {
    return { execute: mockUpdateOrgMemberRoleExecute };
  },
}));

const mockTransferOwnershipExecute = vi.fn();
vi.mock("@/application/use-cases/org-member/TransferOwnership", () => ({
  TransferOwnership: function TransferOwnership() {
    return { execute: mockTransferOwnershipExecute };
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
  orgMemberGateway: {},
  invitationGateway: {},
}));

function mockRole(role: "owner" | "admin" | "member") {
  mockGetCurrentUserExecute.mockResolvedValue({ id: "user_me" });
  mockListOrgMembersExecute.mockResolvedValue([
    { user: { id: "user_me" }, role },
  ]);
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
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/[locale]/org",
        "layout",
      );
      expect(result).toEqual({ ok: true });
    });

    it("returns Not authorized when caller is a plain member", async () => {
      mockRole("member");

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("email", "bob@example.com");
      formData.set("role", "member");

      const result = await inviteMember(undefined, formData);
      expect(result).toEqual({ ok: false, error: "Not authorized" });
      expect(mockCreateInvitationExecute).not.toHaveBeenCalled();
    });

    it("returns error on failure", async () => {
      mockRole("admin");
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
      mockRole("admin");
      mockCancelInvitationExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("invitationId", "inv_1");

      await cancelInvitation(formData);
      expect(mockCancelInvitationExecute).toHaveBeenCalledWith(
        "org_1",
        "inv_1",
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/[locale]/org",
        "layout",
      );
    });

    it("no-ops when caller is a plain member", async () => {
      mockRole("member");

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("invitationId", "inv_1");

      await cancelInvitation(formData);
      expect(mockCancelInvitationExecute).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("returns early when orgId is missing", async () => {
      const formData = new FormData();
      formData.set("invitationId", "inv_1");

      await cancelInvitation(formData);
      expect(mockCancelInvitationExecute).not.toHaveBeenCalled();
    });

    it("swallows errors without revalidating", async () => {
      mockRole("admin");
      mockCancelInvitationExecute.mockRejectedValue(new Error("API 500"));
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

  describe("removeMember", () => {
    it("removes member and revalidates path", async () => {
      mockRole("admin");
      mockRemoveOrgMemberExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");

      await removeMember(formData);
      expect(mockRemoveOrgMemberExecute).toHaveBeenCalledWith(
        "org_1",
        "user_123",
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/[locale]/org",
        "layout",
      );
    });

    it("no-ops when caller is a plain member", async () => {
      mockRole("member");

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");

      await removeMember(formData);
      expect(mockRemoveOrgMemberExecute).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("returns early when orgId is missing", async () => {
      const formData = new FormData();
      formData.set("userId", "user_123");

      await removeMember(formData);
      expect(mockRemoveOrgMemberExecute).not.toHaveBeenCalled();
    });

    it("swallows errors without revalidating", async () => {
      mockRole("admin");
      mockRemoveOrgMemberExecute.mockRejectedValue(new Error("API 500"));
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

  describe("updateMemberRole", () => {
    it("updates role and revalidates path", async () => {
      mockRole("admin");
      mockUpdateOrgMemberRoleExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");
      formData.set("role", "admin");

      await updateMemberRole(formData);
      expect(mockUpdateOrgMemberRoleExecute).toHaveBeenCalledWith(
        "org_1",
        "user_123",
        "admin",
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/[locale]/org",
        "layout",
      );
    });

    it("no-ops when caller is a plain member", async () => {
      mockRole("member");

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");
      formData.set("role", "admin");

      await updateMemberRole(formData);
      expect(mockUpdateOrgMemberRoleExecute).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("returns early when role is not assignable", async () => {
      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");
      formData.set("role", "owner");

      await updateMemberRole(formData);
      expect(mockUpdateOrgMemberRoleExecute).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("returns early when a required field is missing", async () => {
      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("role", "member");

      await updateMemberRole(formData);
      expect(mockUpdateOrgMemberRoleExecute).not.toHaveBeenCalled();
    });

    it("swallows errors without revalidating", async () => {
      mockRole("admin");
      mockUpdateOrgMemberRoleExecute.mockRejectedValue(new Error("API 500"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");
      formData.set("role", "member");

      await updateMemberRole(formData);
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("transferOwnership", () => {
    it("transfers ownership and revalidates path", async () => {
      mockRole("owner");
      mockTransferOwnershipExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_2");

      const result = await transferOwnership(undefined, formData);
      expect(mockTransferOwnershipExecute).toHaveBeenCalledWith(
        "org_1",
        "user_2",
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/[locale]/org",
        "layout",
      );
      expect(result).toEqual({ ok: true });
    });

    it("returns Not authorized when caller is only an admin", async () => {
      mockRole("admin");

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_2");

      const result = await transferOwnership(undefined, formData);
      expect(result).toEqual({ ok: false, error: "Not authorized" });
      expect(mockTransferOwnershipExecute).not.toHaveBeenCalled();
    });

    it("returns error on failure", async () => {
      mockRole("owner");
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
});
