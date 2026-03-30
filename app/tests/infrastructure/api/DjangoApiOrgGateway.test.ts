import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Org } from "@/domain/models/Org";

const mockGetAuthToken = vi.fn().mockResolvedValue("tok_test");
const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { DjangoApiOrgGateway } =
  await import("@/infrastructure/api/DjangoApiOrgGateway");

const org: Org = {
  id: "o1",
  name: "Acme Inc",
  slug: "acme-inc",
  logoUrl: null,
  createdAt: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthToken.mockResolvedValue("tok_test");
});

describe("DjangoApiOrgGateway", () => {
  const gateway = new DjangoApiOrgGateway();

  describe("createOrg", () => {
    it("sends POST /orgs/ with input body", async () => {
      mockApiFetch.mockResolvedValue(org);

      const input = { name: "Acme Inc", slug: "acme-inc" };
      const result = await gateway.createOrg(input);

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/", "tok_test", {
        method: "POST",
        body: JSON.stringify(input),
      });
      expect(result).toEqual(org);
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 400: Bad Request"));

      await expect(
        gateway.createOrg({ name: "Test", slug: "test" }),
      ).rejects.toThrow("API 400: Bad Request");
    });
  });

  describe("getOrg", () => {
    it("fetches with GET /orgs/:orgId/", async () => {
      mockApiFetch.mockResolvedValue(org);

      const result = await gateway.getOrg("o1");

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/", "tok_test");
      expect(result).toEqual(org);
    });

    it("includes orgId in the URL path", async () => {
      mockApiFetch.mockResolvedValue(org);

      await gateway.getOrg("org-xyz-123");

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/orgs/org-xyz-123/",
        "tok_test",
      );
    });
  });

  describe("updateOrg", () => {
    it("sends PATCH /orgs/:orgId/ with input body", async () => {
      const updated = { ...org, name: "Acme Corp" };
      mockApiFetch.mockResolvedValue(updated);

      const input = { name: "Acme Corp" };
      const result = await gateway.updateOrg("o1", input);

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/", "tok_test", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      expect(result).toEqual(updated);
    });
  });

  describe("listUserOrgs", () => {
    it("fetches GET /orgs/ and unwraps results array", async () => {
      const orgs = [org, { ...org, id: "o2", name: "Other", slug: "other" }];
      mockApiFetch.mockResolvedValue({ results: orgs });

      const result = await gateway.listUserOrgs("u1");

      expect(mockGetAuthToken).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/", "tok_test");
      expect(result).toEqual(orgs);
    });

    it("returns an empty array when no orgs exist", async () => {
      mockApiFetch.mockResolvedValue({ results: [] });

      const result = await gateway.listUserOrgs("u1");
      expect(result).toEqual([]);
    });
  });
});
