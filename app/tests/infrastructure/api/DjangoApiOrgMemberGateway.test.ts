import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/infrastructure/api/caseTransform", async () => {
  const actual = await vi.importActual("@/infrastructure/api/caseTransform");
  return actual;
});

const { DjangoApiOrgMemberGateway } =
  await import("@/infrastructure/api/DjangoApiOrgMemberGateway");

const rawMember = {
  id: "m1",
  org: "org-1",
  user: {
    id: "u1",
    email: "alice@example.com",
    full_name: "Alice",
    avatar_url: null,
  },
  role: "admin",
  is_billing: false,
  joined_at: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DjangoApiOrgMemberGateway", () => {
  const gateway = new DjangoApiOrgMemberGateway();

  describe("listMembers", () => {
    it("fetches GET /orgs/:orgId/members/ and maps paginated results", async () => {
      mockApiFetch.mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [rawMember],
      });

      const result = await gateway.listMembers("o1");

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/members/");
      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe("u1");
      expect(result[0].user.email).toBe("alice@example.com");
      expect(result[0].user.fullName).toBe("Alice");
      expect(result[0].role).toBe("admin");
    });

    it("returns an empty array when no members exist", async () => {
      mockApiFetch.mockResolvedValue({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });

      const result = await gateway.listMembers("o1");
      expect(result).toEqual([]);
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.listMembers("o1")).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });

  describe("removeMember", () => {
    it("sends DELETE /orgs/:orgId/members/:userId/", async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await gateway.removeMember("o1", "u2");

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/members/u2/", {
        method: "DELETE",
      });
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 403: Forbidden"));

      await expect(gateway.removeMember("o1", "u2")).rejects.toThrow(
        "API 403: Forbidden",
      );
    });
  });

  describe("updateMemberRole", () => {
    it("sends PATCH /orgs/:orgId/members/:userId/ with role", async () => {
      mockApiFetch.mockResolvedValue({ ...rawMember, role: "owner" });

      await gateway.updateMemberRole("o1", "u1", "owner");

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/members/u1/", {
        method: "PATCH",
        body: JSON.stringify({ role: "owner" }),
      });
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 403: Forbidden"));

      await expect(
        gateway.updateMemberRole("o1", "u1", "admin"),
      ).rejects.toThrow("API 403: Forbidden");
    });
  });

  describe("leaveOrg", () => {
    it("sends POST /orgs/:orgId/leave/", async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await gateway.leaveOrg("o1");

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/leave/", {
        method: "POST",
      });
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 400: Owner cannot leave"));

      await expect(gateway.leaveOrg("o1")).rejects.toThrow(
        "API 400: Owner cannot leave",
      );
    });
  });

  describe("transferOwnership", () => {
    it("sends PUT /orgs/:orgId/owner/ with user_id", async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await gateway.transferOwnership("o1", "u2");

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/owner/", {
        method: "PUT",
        body: JSON.stringify({ user_id: "u2" }),
      });
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 403: Forbidden"));

      await expect(gateway.transferOwnership("o1", "u2")).rejects.toThrow(
        "API 403: Forbidden",
      );
    });
  });
});
