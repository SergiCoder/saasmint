import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Org } from "@/domain/models/Org";

const mockApiFetch = vi.fn();
const mockApiFetchVoid = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiFetchVoid: (...args: unknown[]) => mockApiFetchVoid(...args),
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

  describe("listUserOrgs", () => {
    it("fetches GET /orgs/ and unwraps results array", async () => {
      const orgs = [org, { ...org, id: "o2", name: "Other", slug: "other" }];
      mockApiFetch.mockResolvedValue({ results: orgs });

      const result = await gateway.listUserOrgs();

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/");
      expect(result).toEqual(orgs);
    });

    it("returns an empty array when no orgs exist", async () => {
      mockApiFetch.mockResolvedValue({ results: [] });

      const result = await gateway.listUserOrgs();
      expect(result).toEqual([]);
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.listUserOrgs()).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });

  describe("deleteOrg", () => {
    it("calls DELETE /orgs/{orgId}/", async () => {
      mockApiFetchVoid.mockResolvedValue(undefined);

      await gateway.deleteOrg("org_1");

      expect(mockApiFetchVoid).toHaveBeenCalledWith("/orgs/org_1/", {
        method: "DELETE",
      });
    });

    it("propagates errors from apiFetchVoid", async () => {
      mockApiFetchVoid.mockRejectedValue(new Error("API 403: Forbidden"));

      await expect(gateway.deleteOrg("org_1")).rejects.toThrow(
        "API 403: Forbidden",
      );
    });
  });
});
