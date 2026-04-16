import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUserOrgs = vi.fn();
const mockListOrgMembers = vi.fn();

vi.mock("@/app/[locale]/(app)/_data/getUserOrgs", () => ({
  getUserOrgs: (...args: unknown[]) => mockGetUserOrgs(...args),
}));

vi.mock("@/application/use-cases/org-member/ListOrgMembers", () => ({
  ListOrgMembers: function ListOrgMembers() {
    return { execute: mockListOrgMembers };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  orgMemberGateway: {},
}));

// React.cache memoizes by argument identity within a render. Reset module
// state between tests so each call goes through the use cases freshly.
let canManageBilling: typeof import("@/app/[locale]/(app)/subscription/_data/canManageBilling").canManageBilling;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  const mod =
    await import("@/app/[locale]/(app)/subscription/_data/canManageBilling");
  canManageBilling = mod.canManageBilling;
});

const user = { id: "user-1" } as Parameters<typeof canManageBilling>[0];

const personalSub = {
  plan: { context: "personal" },
} as Parameters<typeof canManageBilling>[1];

const teamSub = {
  plan: { context: "team" },
} as Parameters<typeof canManageBilling>[1];

describe("canManageBilling", () => {
  it("returns true for personal subscriptions without touching gateways", async () => {
    const result = await canManageBilling(user, personalSub);
    expect(result).toBe(true);
    expect(mockGetUserOrgs).not.toHaveBeenCalled();
    expect(mockListOrgMembers).not.toHaveBeenCalled();
  });

  it("returns true when the user is the billing member of their org", async () => {
    mockGetUserOrgs.mockResolvedValueOnce([{ id: "org-1" }]);
    mockListOrgMembers.mockResolvedValueOnce([
      { user: { id: "user-1" }, isBilling: true },
      { user: { id: "user-2" }, isBilling: false },
    ]);

    const result = await canManageBilling(user, teamSub);

    expect(result).toBe(true);
    expect(mockGetUserOrgs).toHaveBeenCalledWith("user-1");
    expect(mockListOrgMembers).toHaveBeenCalledWith("org-1");
  });

  it("returns false when the user is a member but not the billing one", async () => {
    mockGetUserOrgs.mockResolvedValueOnce([{ id: "org-1" }]);
    mockListOrgMembers.mockResolvedValueOnce([
      { user: { id: "user-1" }, isBilling: false },
    ]);

    const result = await canManageBilling(user, teamSub);
    expect(result).toBe(false);
  });

  it("returns false when the user is not in the org member list", async () => {
    mockGetUserOrgs.mockResolvedValueOnce([{ id: "org-1" }]);
    mockListOrgMembers.mockResolvedValueOnce([
      { user: { id: "someone-else" }, isBilling: true },
    ]);

    const result = await canManageBilling(user, teamSub);
    expect(result).toBe(false);
  });

  it("returns false when the user has no orgs", async () => {
    mockGetUserOrgs.mockResolvedValueOnce([]);

    const result = await canManageBilling(user, teamSub);
    expect(result).toBe(false);
    expect(mockListOrgMembers).not.toHaveBeenCalled();
  });

  it("returns false when getUserOrgs returns empty (e.g. gateway error)", async () => {
    mockGetUserOrgs.mockResolvedValueOnce([]);

    const result = await canManageBilling(user, teamSub);

    expect(result).toBe(false);
    expect(mockListOrgMembers).not.toHaveBeenCalled();
  });

  it("returns false and logs when the member gateway throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetUserOrgs.mockResolvedValueOnce([{ id: "org-1" }]);
    mockListOrgMembers.mockRejectedValueOnce(new Error("members down"));

    const result = await canManageBilling(user, teamSub);

    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
