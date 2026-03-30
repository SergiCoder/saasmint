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

const mockCreateOrgExecute = vi.fn();
vi.mock("@/application/use-cases/org/CreateOrg", () => ({
  CreateOrg: function CreateOrg() {
    return { execute: mockCreateOrgExecute };
  },
}));

const mockInviteOrgMemberExecute = vi.fn();
vi.mock("@/application/use-cases/org-member/InviteOrgMember", () => ({
  InviteOrgMember: function InviteOrgMember() {
    return { execute: mockInviteOrgMemberExecute };
  },
}));

const mockRemoveOrgMemberExecute = vi.fn();
vi.mock("@/application/use-cases/org-member/RemoveOrgMember", () => ({
  RemoveOrgMember: function RemoveOrgMember() {
    return { execute: mockRemoveOrgMemberExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  orgGateway: {},
  orgMemberGateway: {},
}));

let createOrg: typeof import("@/app/actions/org").createOrg;
let inviteMember: typeof import("@/app/actions/org").inviteMember;
let removeMember: typeof import("@/app/actions/org").removeMember;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/org");
  createOrg = mod.createOrg;
  inviteMember = mod.inviteMember;
  removeMember = mod.removeMember;
});

describe("org server actions", () => {
  describe("createOrg", () => {
    it("redirects to org page on success", async () => {
      mockCreateOrgExecute.mockResolvedValue({
        id: "org_1",
        name: "Acme",
        slug: "acme",
        logoUrl: null,
      });

      const formData = new FormData();
      formData.set("name", "Acme");
      formData.set("slug", "acme");

      await expect(createOrg(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockCreateOrgExecute).toHaveBeenCalledWith({
        name: "Acme",
        slug: "acme",
      });
      expect(mockRedirect).toHaveBeenCalledWith("/org/acme");
    });

    it("returns error for missing fields", async () => {
      const formData = new FormData();
      const result = await createOrg(undefined, formData);
      expect(result).toEqual({ error: "Name and slug are required" });
      expect(mockCreateOrgExecute).not.toHaveBeenCalled();
    });

    it("returns error on failure", async () => {
      mockCreateOrgExecute.mockRejectedValue(new Error("Slug taken"));

      const formData = new FormData();
      formData.set("name", "Acme");
      formData.set("slug", "acme");

      const result = await createOrg(undefined, formData);
      expect(result).toEqual({ error: "Failed to create organization" });
    });
  });

  describe("inviteMember", () => {
    it("revalidates path and returns success on invite", async () => {
      mockInviteOrgMemberExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("email", "new@example.com");
      formData.set("role", "member");

      const result = await inviteMember(undefined, formData);
      expect(mockInviteOrgMemberExecute).toHaveBeenCalledWith(
        "org_1",
        "new@example.com",
        "member",
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org");
      expect(result).toEqual({ success: true });
    });

    it("returns error on failure", async () => {
      mockInviteOrgMemberExecute.mockRejectedValue(
        new Error("Already a member"),
      );

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("email", "existing@example.com");
      formData.set("role", "admin");

      const result = await inviteMember(undefined, formData);
      expect(result).toEqual({ error: "Failed to invite member" });
    });

    it("returns error for invalid role", async () => {
      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("email", "new@example.com");
      formData.set("role", "superadmin");

      const result = await inviteMember(undefined, formData);
      expect(result).toEqual({ error: "Invalid input" });
      expect(mockInviteOrgMemberExecute).not.toHaveBeenCalled();
    });

    it("returns error when required fields are missing", async () => {
      const formData = new FormData();

      const result = await inviteMember(undefined, formData);
      expect(result).toEqual({ error: "Invalid input" });
      expect(mockInviteOrgMemberExecute).not.toHaveBeenCalled();
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

      const result = await removeMember(formData);
      expect(result).toBeUndefined();
      expect(mockRemoveOrgMemberExecute).not.toHaveBeenCalled();
    });

    it("returns early when userId is missing", async () => {
      const formData = new FormData();
      formData.set("orgId", "org_1");

      const result = await removeMember(formData);
      expect(result).toBeUndefined();
      expect(mockRemoveOrgMemberExecute).not.toHaveBeenCalled();
    });
  });
});
