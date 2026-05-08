import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListInvitations = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  invitationGateway: {
    listInvitations: (...args: unknown[]) => mockListInvitations(...args),
  },
}));

let getOrgInvitations: typeof import("@/app/[locale]/(app)/_data/getOrgInvitations").getOrgInvitations;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const mod = await import("@/app/[locale]/(app)/_data/getOrgInvitations");
  getOrgInvitations = mod.getOrgInvitations;
});

describe("getOrgInvitations", () => {
  it("returns the list of invitations resolved by the gateway", async () => {
    const invitations = [
      { id: "inv1", email: "bob@example.com", status: "pending" },
      { id: "inv2", email: "carol@example.com", status: "pending" },
    ];
    mockListInvitations.mockResolvedValue(invitations);

    const result = await getOrgInvitations("org-1");

    expect(mockListInvitations).toHaveBeenCalledWith("org-1");
    expect(result).toBe(invitations);
  });

  it("returns an empty array when the gateway throws (graceful fallback)", async () => {
    mockListInvitations.mockRejectedValue(new Error("API 500"));

    const result = await getOrgInvitations("org-1");

    expect(result).toEqual([]);
  });

  it("returns an empty array when the gateway resolves with no rows", async () => {
    mockListInvitations.mockResolvedValue([]);

    const result = await getOrgInvitations("org-1");

    expect(result).toEqual([]);
  });

  it("passes the orgId to the gateway", async () => {
    mockListInvitations.mockResolvedValue([]);

    await getOrgInvitations("org-abc");

    expect(mockListInvitations).toHaveBeenCalledWith("org-abc");
  });
});
