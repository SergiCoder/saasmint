import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListUserOrgs = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  orgGateway: {
    listUserOrgs: (...args: unknown[]) => mockListUserOrgs(...args),
  },
}));

let getUserOrgs: typeof import("@/app/[locale]/_data/getUserOrgs").getUserOrgs;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const mod = await import("@/app/[locale]/_data/getUserOrgs");
  getUserOrgs = mod.getUserOrgs;
});

describe("getUserOrgs", () => {
  it("returns the orgs list resolved by the gateway", async () => {
    const orgs = [
      { id: "o1", name: "Acme", slug: "acme", logoUrl: null },
      { id: "o2", name: "Globex", slug: "globex", logoUrl: null },
    ];
    mockListUserOrgs.mockResolvedValue(orgs);

    const result = await getUserOrgs();

    expect(mockListUserOrgs).toHaveBeenCalledWith();
    expect(result).toBe(orgs);
  });

  it("returns an empty array when the gateway throws", async () => {
    mockListUserOrgs.mockRejectedValue(new Error("API 500"));

    const result = await getUserOrgs();

    expect(result).toEqual([]);
  });

  it("returns an empty array when the user has no orgs", async () => {
    mockListUserOrgs.mockResolvedValue([]);

    const result = await getUserOrgs();

    expect(result).toEqual([]);
  });
});
