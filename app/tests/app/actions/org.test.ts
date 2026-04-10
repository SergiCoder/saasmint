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

const mockAddOrgMemberExecute = vi.fn();
vi.mock("@/application/use-cases/org-member/InviteOrgMember", () => ({
  AddOrgMember: function AddOrgMember() {
    return { execute: mockAddOrgMemberExecute };
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
let addMember: typeof import("@/app/actions/org").addMember;
let removeMember: typeof import("@/app/actions/org").removeMember;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/org");
  createOrg = mod.createOrg;
  addMember = mod.addMember;
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

  describe("addMember", () => {
    it("revalidates path and returns success on add", async () => {
      mockAddOrgMemberExecute.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");
      formData.set("role", "member");

      const result = await addMember(undefined, formData);
      expect(mockAddOrgMemberExecute).toHaveBeenCalledWith(
        "org_1",
        "user_123",
        "member",
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/org");
      expect(result).toEqual({ success: true });
    });

    it("returns error on failure", async () => {
      mockAddOrgMemberExecute.mockRejectedValue(new Error("Already a member"));

      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");
      formData.set("role", "admin");

      const result = await addMember(undefined, formData);
      expect(result).toEqual({ error: "Failed to add member" });
    });

    it("returns error for invalid role", async () => {
      const formData = new FormData();
      formData.set("orgId", "org_1");
      formData.set("userId", "user_123");
      formData.set("role", "superadmin");

      const result = await addMember(undefined, formData);
      expect(result).toEqual({ error: "Invalid input" });
      expect(mockAddOrgMemberExecute).not.toHaveBeenCalled();
    });

    it("returns error when required fields are missing", async () => {
      const formData = new FormData();

      const result = await addMember(undefined, formData);
      expect(result).toEqual({ error: "Invalid input" });
      expect(mockAddOrgMemberExecute).not.toHaveBeenCalled();
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
