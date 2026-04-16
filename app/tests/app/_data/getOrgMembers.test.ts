import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListOrgMembersExecute = vi.fn();
vi.mock("@/application/use-cases/org-member/ListOrgMembers", () => ({
  ListOrgMembers: function ListOrgMembers() {
    return { execute: mockListOrgMembersExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  orgMemberGateway: {},
}));

let getOrgMembers: typeof import("@/app/[locale]/(app)/_data/getOrgMembers").getOrgMembers;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const mod = await import("@/app/[locale]/(app)/_data/getOrgMembers");
  getOrgMembers = mod.getOrgMembers;
});

describe("getOrgMembers", () => {
  it("returns the members resolved by the use-case", async () => {
    const members = [
      { user: { id: "u1" }, role: "owner", isBilling: true },
      { user: { id: "u2" }, role: "member", isBilling: false },
    ];
    mockListOrgMembersExecute.mockResolvedValue(members);

    const result = await getOrgMembers("org_1");

    expect(mockListOrgMembersExecute).toHaveBeenCalledWith("org_1");
    expect(result).toBe(members);
  });

  it("returns an empty array and logs when the use-case throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockListOrgMembersExecute.mockRejectedValue(new Error("API 500"));

    const result = await getOrgMembers("org_1");

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns an empty array when the org has no members", async () => {
    mockListOrgMembersExecute.mockResolvedValue([]);

    const result = await getOrgMembers("org_1");

    expect(result).toEqual([]);
  });
});
