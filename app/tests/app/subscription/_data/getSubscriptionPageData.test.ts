import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";

// --- Gateway + inner _data fetcher mocks ---------------------------------

const mockListPlans = vi.fn();
const mockListProducts = vi.fn();
const mockGetSubscription = vi.fn();
const mockGetUserOrgs = vi.fn();
const mockGetOrgMembers = vi.fn();
const mockCanManageBilling = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  planGateway: {
    listPlans: (...args: unknown[]) => mockListPlans(...args),
  },
  productGateway: {
    listProducts: (...args: unknown[]) => mockListProducts(...args),
  },
}));

vi.mock("@/app/[locale]/(app)/_data/getSubscription", () => ({
  getSubscription: (...args: unknown[]) => mockGetSubscription(...args),
}));

vi.mock("@/app/[locale]/(app)/_data/getUserOrgs", () => ({
  getUserOrgs: (...args: unknown[]) => mockGetUserOrgs(...args),
}));

vi.mock("@/app/[locale]/(app)/_data/getOrgMembers", () => ({
  getOrgMembers: (...args: unknown[]) => mockGetOrgMembers(...args),
}));

vi.mock("@/app/[locale]/(app)/subscription/_data/canManageBilling", () => ({
  canManageBilling: (...args: unknown[]) => mockCanManageBilling(...args),
}));

let getSubscriptionPageData: typeof import("@/app/[locale]/(app)/subscription/_data/getSubscriptionPageData").getSubscriptionPageData;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  const mod =
    await import("@/app/[locale]/(app)/subscription/_data/getSubscriptionPageData");
  getSubscriptionPageData = mod.getSubscriptionPageData;
});

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "user@example.com",
    fullName: "User One",
    avatarUrl: null,
    accountType: "personal",
    preferredLocale: "en",
    preferredCurrency: "usd",
    phonePrefix: null,
    phone: null,
    timezone: null,
    jobTitle: null,
    pronouns: null,
    bio: null,
    isVerified: true,
    createdAt: "2025-01-01T00:00:00Z",
    registrationMethod: "email",
    linkedProviders: [],
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  } as User;
}

const personalPlan = { id: "p1", context: "personal" };
const teamPlan = { id: "p2", context: "team" };

describe("getSubscriptionPageData", () => {
  it("forwards the user's preferred currency to plans, products, and subscription", async () => {
    const user = makeUser({ preferredCurrency: "eur" });
    mockGetSubscription.mockResolvedValue(null);
    mockListPlans.mockResolvedValue([]);
    mockListProducts.mockResolvedValue([]);
    mockGetUserOrgs.mockResolvedValue([]);

    await getSubscriptionPageData(user);

    expect(mockGetSubscription).toHaveBeenCalledWith("eur");
    expect(mockListPlans).toHaveBeenCalledWith("eur");
    expect(mockListProducts).toHaveBeenCalledWith("eur");
    expect(mockGetUserOrgs).toHaveBeenCalledWith();
  });

  it("returns an empty page shape when nothing is resolved (no sub, no orgs)", async () => {
    mockGetSubscription.mockResolvedValue(null);
    mockListPlans.mockResolvedValue([]);
    mockListProducts.mockResolvedValue([]);
    mockGetUserOrgs.mockResolvedValue([]);

    const data = await getSubscriptionPageData(makeUser());

    expect(data).toEqual({
      subscription: null,
      plans: [],
      products: [],
      userOrgs: [],
      canManage: false,
      teamOwnerName: null,
    });
    expect(mockCanManageBilling).not.toHaveBeenCalled();
    expect(mockGetOrgMembers).not.toHaveBeenCalled();
  });

  it("returns plans=[] and logs when planGateway.listPlans rejects", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetSubscription.mockResolvedValue(null);
    mockListPlans.mockRejectedValue(new Error("boom"));
    mockListProducts.mockResolvedValue([{ id: "prod_1" }]);
    mockGetUserOrgs.mockResolvedValue([]);

    const data = await getSubscriptionPageData(makeUser());

    expect(data.plans).toEqual([]);
    expect(data.products).toEqual([{ id: "prod_1" }]);
    expect(errSpy).toHaveBeenCalledWith(
      "Failed to fetch plans",
      expect.any(Error),
    );
    errSpy.mockRestore();
  });

  it("returns products=[] and logs when productGateway.listProducts rejects", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetSubscription.mockResolvedValue(null);
    mockListPlans.mockResolvedValue([{ id: "plan_1" }]);
    mockListProducts.mockRejectedValue(new Error("boom"));
    mockGetUserOrgs.mockResolvedValue([]);

    const data = await getSubscriptionPageData(makeUser());

    expect(data.products).toEqual([]);
    expect(data.plans).toEqual([{ id: "plan_1" }]);
    expect(errSpy).toHaveBeenCalledWith(
      "Failed to fetch products",
      expect.any(Error),
    );
    errSpy.mockRestore();
  });

  it("resolves canManage via canManageBilling when a subscription exists", async () => {
    const subscription = { id: "sub_1", plan: personalPlan };
    mockGetSubscription.mockResolvedValue(subscription);
    mockListPlans.mockResolvedValue([]);
    mockListProducts.mockResolvedValue([]);
    mockGetUserOrgs.mockResolvedValue([]);
    mockCanManageBilling.mockResolvedValue(true);

    const user = makeUser();
    const data = await getSubscriptionPageData(user);

    expect(mockCanManageBilling).toHaveBeenCalledWith(user, subscription);
    expect(data.canManage).toBe(true);
    expect(data.subscription).toBe(subscription);
  });

  it("does not call canManageBilling when there is no subscription", async () => {
    mockGetSubscription.mockResolvedValue(null);
    mockListPlans.mockResolvedValue([]);
    mockListProducts.mockResolvedValue([]);
    mockGetUserOrgs.mockResolvedValue([]);

    const data = await getSubscriptionPageData(makeUser());

    expect(mockCanManageBilling).not.toHaveBeenCalled();
    expect(data.canManage).toBe(false);
  });

  it("resolves teamOwnerName from the first org's owner when the sub is a team sub", async () => {
    const subscription = { id: "sub_t", plan: teamPlan };
    mockGetSubscription.mockResolvedValue(subscription);
    mockListPlans.mockResolvedValue([]);
    mockListProducts.mockResolvedValue([]);
    mockGetUserOrgs.mockResolvedValue([{ id: "org_1" }, { id: "org_2" }]);
    mockCanManageBilling.mockResolvedValue(false);
    mockGetOrgMembers.mockResolvedValue([
      { user: { id: "m1", fullName: "Member One" }, role: "member" },
      { user: { id: "owner", fullName: "Alice Owner" }, role: "owner" },
    ]);

    const data = await getSubscriptionPageData(makeUser());

    expect(mockGetOrgMembers).toHaveBeenCalledWith("org_1");
    expect(data.teamOwnerName).toBe("Alice Owner");
  });

  it("leaves teamOwnerName null when the first org has no owner member", async () => {
    const subscription = { id: "sub_t", plan: teamPlan };
    mockGetSubscription.mockResolvedValue(subscription);
    mockListPlans.mockResolvedValue([]);
    mockListProducts.mockResolvedValue([]);
    mockGetUserOrgs.mockResolvedValue([{ id: "org_1" }]);
    mockCanManageBilling.mockResolvedValue(false);
    mockGetOrgMembers.mockResolvedValue([
      { user: { id: "m1", fullName: "Member One" }, role: "member" },
    ]);

    const data = await getSubscriptionPageData(makeUser());

    expect(data.teamOwnerName).toBeNull();
  });

  it("does not look up org members when the sub context is personal", async () => {
    const subscription = { id: "sub_p", plan: personalPlan };
    mockGetSubscription.mockResolvedValue(subscription);
    mockListPlans.mockResolvedValue([]);
    mockListProducts.mockResolvedValue([]);
    mockGetUserOrgs.mockResolvedValue([{ id: "org_1" }]);
    mockCanManageBilling.mockResolvedValue(true);

    const data = await getSubscriptionPageData(makeUser());

    expect(mockGetOrgMembers).not.toHaveBeenCalled();
    expect(data.teamOwnerName).toBeNull();
  });

  it("does not look up org members when the user has no orgs (even on a team sub)", async () => {
    const subscription = { id: "sub_t", plan: teamPlan };
    mockGetSubscription.mockResolvedValue(subscription);
    mockListPlans.mockResolvedValue([]);
    mockListProducts.mockResolvedValue([]);
    mockGetUserOrgs.mockResolvedValue([]);
    mockCanManageBilling.mockResolvedValue(false);

    const data = await getSubscriptionPageData(makeUser());

    expect(mockGetOrgMembers).not.toHaveBeenCalled();
    expect(data.teamOwnerName).toBeNull();
  });
});
