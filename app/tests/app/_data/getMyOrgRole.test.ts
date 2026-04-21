import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetCurrentUser = vi.fn();
const mockGetUserOrgs = vi.fn();
const mockGetOrgMembers = vi.fn();

vi.mock("@/app/[locale]/(app)/_data/getCurrentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/app/[locale]/(app)/_data/getUserOrgs", () => ({
  getUserOrgs: () => mockGetUserOrgs(),
}));

vi.mock("@/app/[locale]/(app)/_data/getOrgMembers", () => ({
  getOrgMembers: (orgId: string) => mockGetOrgMembers(orgId),
}));

let getMyOrgRole: typeof import("@/app/[locale]/(app)/_data/getMyOrgRole").getMyOrgRole;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const mod = await import("@/app/[locale]/(app)/_data/getMyOrgRole");
  getMyOrgRole = mod.getMyOrgRole;
});

describe("getMyOrgRole", () => {
  it("returns null when the user has no orgs", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "u1" });
    mockGetUserOrgs.mockResolvedValue([]);

    const result = await getMyOrgRole();

    expect(result).toBeNull();
    expect(mockGetOrgMembers).not.toHaveBeenCalled();
  });

  it("returns 'owner' when the current user is the owner of the first org", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "u1" });
    mockGetUserOrgs.mockResolvedValue([
      { id: "org_1", name: "Acme" },
      { id: "org_2", name: "Globex" },
    ]);
    mockGetOrgMembers.mockResolvedValue([
      { user: { id: "u1" }, role: "owner" },
      { user: { id: "u2" }, role: "member" },
    ]);

    const result = await getMyOrgRole();

    expect(result).toBe("owner");
    expect(mockGetOrgMembers).toHaveBeenCalledWith("org_1");
  });

  it("returns 'admin' when the current user is an admin of the first org", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "u2" });
    mockGetUserOrgs.mockResolvedValue([{ id: "org_1" }]);
    mockGetOrgMembers.mockResolvedValue([
      { user: { id: "u1" }, role: "owner" },
      { user: { id: "u2" }, role: "admin" },
    ]);

    const result = await getMyOrgRole();

    expect(result).toBe("admin");
  });

  it("falls back to 'member' when the user is not present in the member list", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "u_missing" });
    mockGetUserOrgs.mockResolvedValue([{ id: "org_1" }]);
    mockGetOrgMembers.mockResolvedValue([
      { user: { id: "u1" }, role: "owner" },
    ]);

    const result = await getMyOrgRole();

    expect(result).toBe("member");
  });

  it("falls back to 'member' when getOrgMembers throws", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "u1" });
    mockGetUserOrgs.mockResolvedValue([{ id: "org_1" }]);
    mockGetOrgMembers.mockRejectedValue(new Error("API 500"));

    const result = await getMyOrgRole();

    expect(result).toBe("member");
  });

  it("only inspects the first org when multiple orgs are returned", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "u1" });
    mockGetUserOrgs.mockResolvedValue([
      { id: "org_first" },
      { id: "org_second" },
    ]);
    mockGetOrgMembers.mockResolvedValue([
      { user: { id: "u1" }, role: "member" },
    ]);

    await getMyOrgRole();

    expect(mockGetOrgMembers).toHaveBeenCalledTimes(1);
    expect(mockGetOrgMembers).toHaveBeenCalledWith("org_first");
  });
});
