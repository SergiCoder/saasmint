import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListUserOrgsExecute = vi.fn();
vi.mock("@/application/use-cases/org/ListUserOrgs", () => ({
  ListUserOrgs: function ListUserOrgs() {
    return { execute: mockListUserOrgsExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  orgGateway: {},
}));

let getUserOrgs: typeof import("@/app/[locale]/(app)/_data/getUserOrgs").getUserOrgs;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const mod = await import("@/app/[locale]/(app)/_data/getUserOrgs");
  getUserOrgs = mod.getUserOrgs;
});

describe("getUserOrgs", () => {
  it("returns the orgs list resolved by the use-case", async () => {
    const orgs = [
      { id: "o1", name: "Acme", slug: "acme", logoUrl: null },
      { id: "o2", name: "Globex", slug: "globex", logoUrl: null },
    ];
    mockListUserOrgsExecute.mockResolvedValue(orgs);

    const result = await getUserOrgs("user_1");

    expect(mockListUserOrgsExecute).toHaveBeenCalledWith("user_1");
    expect(result).toBe(orgs);
  });

  it("returns an empty array when the use-case throws", async () => {
    mockListUserOrgsExecute.mockRejectedValue(new Error("API 500"));

    const result = await getUserOrgs("user_1");

    expect(result).toEqual([]);
  });

  it("returns an empty array when the user has no orgs", async () => {
    mockListUserOrgsExecute.mockResolvedValue([]);

    const result = await getUserOrgs("user_1");

    expect(result).toEqual([]);
  });
});
