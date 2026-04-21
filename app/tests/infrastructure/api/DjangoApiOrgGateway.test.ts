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
});
