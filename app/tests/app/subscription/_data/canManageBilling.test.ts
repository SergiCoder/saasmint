import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUserOrgs = vi.fn();
const mockListOrgMembers = vi.fn();

vi.mock("@/app/[locale]/(app)/_data/getUserOrgs", () => ({
  getUserOrgs: (...args: unknown[]) => mockGetUserOrgs(...args),
}));

vi.mock("@/app/[locale]/(app)/_data/getOrgMembers", () => ({
  getOrgMembers: (...args: unknown[]) => mockListOrgMembers(...args),
}));

vi.mock("@/infrastructure/registry", () => ({
  orgMemberGateway: {},
}));

// React.cache memoizes by argument identity within a render. Reset module
// state between tests so each call goes through the gateways freshly.
let canManageBilling: typeof import("@/app/[locale]/(app)/subscription/_data/canManageBilling").canManageBilling;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  const mod =
    await import("@/app/[locale]/(app)/subscription/_data/canManageBilling");
  canManageBilling = mod.canManageBilling;
});

const userId: Parameters<typeof canManageBilling>[0] = "user-1";

const personalSub = {
  plan: { context: "personal" },
} as Parameters<typeof canManageBilling>[1];

const teamSub = {
  plan: { context: "team" },
} as Parameters<typeof canManageBilling>[1];

describe("canManageBilling", () => {
  it("returns true for personal subscriptions without touching gateways", async () => {
    const result = await canManageBilling(userId, personalSub);
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

    const result = await canManageBilling(userId, teamSub);

    expect(result).toBe(true);
    expect(mockGetUserOrgs).toHaveBeenCalledWith();
    expect(mockListOrgMembers).toHaveBeenCalledWith("org-1");
  });

  it("returns false when the user is a member but not the billing one", async () => {
    mockGetUserOrgs.mockResolvedValueOnce([{ id: "org-1" }]);
    mockListOrgMembers.mockResolvedValueOnce([
      { user: { id: "user-1" }, isBilling: false },
    ]);

    const result = await canManageBilling(userId, teamSub);
    expect(result).toBe(false);
  });

  it("returns false when the user is not in the org member list", async () => {
    mockGetUserOrgs.mockResolvedValueOnce([{ id: "org-1" }]);
    mockListOrgMembers.mockResolvedValueOnce([
      { user: { id: "someone-else" }, isBilling: true },
    ]);

    const result = await canManageBilling(userId, teamSub);
    expect(result).toBe(false);
  });

  it("returns false when the user has no orgs", async () => {
    mockGetUserOrgs.mockResolvedValueOnce([]);

    const result = await canManageBilling(userId, teamSub);
    expect(result).toBe(false);
    expect(mockListOrgMembers).not.toHaveBeenCalled();
  });

  it("returns false when getUserOrgs returns empty (e.g. gateway error)", async () => {
    mockGetUserOrgs.mockResolvedValueOnce([]);

    const result = await canManageBilling(userId, teamSub);

    expect(result).toBe(false);
    expect(mockListOrgMembers).not.toHaveBeenCalled();
  });

  it("returns false when getOrgMembers resolves to an empty list", async () => {
    // getOrgMembers swallows gateway errors internally and returns [].
    mockGetUserOrgs.mockResolvedValueOnce([{ id: "org-1" }]);
    mockListOrgMembers.mockResolvedValueOnce([]);

    const result = await canManageBilling(userId, teamSub);
    expect(result).toBe(false);
  });
});
