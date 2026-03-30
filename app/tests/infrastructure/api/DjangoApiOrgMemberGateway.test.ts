import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OrgMember } from "@/domain/models/OrgMember";

const mockGetAuthToken = vi.fn().mockResolvedValue("tok_test");
const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { DjangoApiOrgMemberGateway } =
  await import("@/infrastructure/api/DjangoApiOrgMemberGateway");

const member: OrgMember = {
  id: "m1",
  userId: "u1",
  email: "alice@example.com",
  fullName: "Alice",
  role: "admin",
  isBilling: false,
  joinedAt: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthToken.mockResolvedValue("tok_test");
});

describe("DjangoApiOrgMemberGateway", () => {
  const gateway = new DjangoApiOrgMemberGateway();

  describe("listMembers", () => {
    it("fetches GET /orgs/:orgId/members/ and unwraps results", async () => {
      const members = [member, { ...member, id: "m2", userId: "u2" }];
      mockApiFetch.mockResolvedValue({ results: members });

      const result = await gateway.listMembers("o1");

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/orgs/o1/members/",
        "tok_test",
      );
      expect(result).toEqual(members);
    });

    it("returns an empty array when no members exist", async () => {
      mockApiFetch.mockResolvedValue({ results: [] });

      const result = await gateway.listMembers("o1");
      expect(result).toEqual([]);
    });
  });

  describe("inviteMember", () => {
    it("sends POST /orgs/:orgId/members/ with email and role", async () => {
      mockApiFetch.mockResolvedValue(member);

      await gateway.inviteMember("o1", "bob@example.com", "member");

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/orgs/o1/members/",
        "tok_test",
        {
          method: "POST",
          body: JSON.stringify({ email: "bob@example.com", role: "member" }),
        },
      );
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 409: Already a member"));

      await expect(
        gateway.inviteMember("o1", "bob@example.com", "member"),
      ).rejects.toThrow("API 409: Already a member");
    });
  });

  describe("removeMember", () => {
    it("sends DELETE /orgs/:orgId/members/:userId/", async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await gateway.removeMember("o1", "u2");

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/orgs/o1/members/u2/",
        "tok_test",
        {
          method: "DELETE",
        },
      );
    });
  });

  describe("updateMemberRole", () => {
    it("sends PATCH /orgs/:orgId/members/:userId/ with role", async () => {
      mockApiFetch.mockResolvedValue({ ...member, role: "owner" });

      await gateway.updateMemberRole("o1", "u1", "owner");

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/orgs/o1/members/u1/",
        "tok_test",
        {
          method: "PATCH",
          body: JSON.stringify({ role: "owner" }),
        },
      );
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 403: Forbidden"));

      await expect(
        gateway.updateMemberRole("o1", "u1", "admin"),
      ).rejects.toThrow("API 403: Forbidden");
    });
  });
});
