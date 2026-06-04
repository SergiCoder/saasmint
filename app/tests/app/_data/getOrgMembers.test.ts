import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListMembers = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  orgMemberGateway: {
    listMembers: (...args: unknown[]) => mockListMembers(...args),
  },
}));

let getOrgMembers: typeof import("@/app/[locale]/_data/getOrgMembers").getOrgMembers;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const mod = await import("@/app/[locale]/_data/getOrgMembers");
  getOrgMembers = mod.getOrgMembers;
});

describe("getOrgMembers", () => {
  it("returns the members resolved by the gateway", async () => {
    const members = [
      { user: { id: "u1" }, role: "owner", isBilling: true },
      { user: { id: "u2" }, role: "member", isBilling: false },
    ];
    mockListMembers.mockResolvedValue(members);

    const result = await getOrgMembers("org_1");

    expect(mockListMembers).toHaveBeenCalledWith("org_1");
    expect(result).toBe(members);
  });

  it("returns an empty array and logs when the gateway throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockListMembers.mockRejectedValue(new Error("API 500"));

    const result = await getOrgMembers("org_1");

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns an empty array when the org has no members", async () => {
    mockListMembers.mockResolvedValue([]);

    const result = await getOrgMembers("org_1");

    expect(result).toEqual([]);
  });
});
