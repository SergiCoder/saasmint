import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Org } from "@/domain/models/Org";

const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
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
});

describe("DjangoApiOrgGateway", () => {
  const gateway = new DjangoApiOrgGateway();

  describe("getOrg", () => {
    it("fetches with GET /orgs/:orgId/", async () => {
      mockApiFetch.mockResolvedValue(org);

      const result = await gateway.getOrg("o1");

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/");
      expect(result).toEqual(org);
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 404: Not Found"));

      await expect(gateway.getOrg("o1")).rejects.toThrow("API 404: Not Found");
    });
  });

  describe("updateOrg", () => {
    it("sends PATCH /orgs/:orgId/ with input body", async () => {
      const updated = { ...org, name: "Acme Corp" };
      mockApiFetch.mockResolvedValue(updated);

      const input = { name: "Acme Corp" };
      const result = await gateway.updateOrg("o1", input);

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      expect(result).toEqual(updated);
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 403: Forbidden"));

      await expect(gateway.updateOrg("o1", { name: "Test" })).rejects.toThrow(
        "API 403: Forbidden",
      );
    });
  });

  describe("listUserOrgs", () => {
    it("fetches GET /orgs/ and unwraps results array", async () => {
      const orgs = [org, { ...org, id: "o2", name: "Other", slug: "other" }];
      mockApiFetch.mockResolvedValue({ results: orgs });

      const result = await gateway.listUserOrgs("u1");

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/");
      expect(result).toEqual(orgs);
    });

    it("returns an empty array when no orgs exist", async () => {
      mockApiFetch.mockResolvedValue({ results: [] });

      const result = await gateway.listUserOrgs("u1");
      expect(result).toEqual([]);
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.listUserOrgs("u1")).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });

  describe("deleteOrg", () => {
    it("sends DELETE /orgs/:orgId/", async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await gateway.deleteOrg("o1");

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/", {
        method: "DELETE",
      });
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 403: Forbidden"));

      await expect(gateway.deleteOrg("o1")).rejects.toThrow(
        "API 403: Forbidden",
      );
    });
  });
});
