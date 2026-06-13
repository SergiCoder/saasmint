import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Plan } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";
import type { Subscription } from "@/domain/models/Subscription";
import type { Org } from "@/domain/models/Org";
import type { User } from "@/domain/models/User";

// All fetchers that getPricingCatalog fans out to must be mocked before the
// module under test is imported; vitest hoists vi.mock calls automatically.
const mockGetPlans = vi.fn();
const mockGetProducts = vi.fn();
const mockGetSubscriptions = vi.fn();
const mockGetUserOrgs = vi.fn();

vi.mock("@/app/[locale]/_data/getPlans", () => ({
  getPlans: (...args: unknown[]) => mockGetPlans(...args),
}));

vi.mock("@/app/[locale]/_data/getProducts", () => ({
  getProducts: (...args: unknown[]) => mockGetProducts(...args),
}));

vi.mock("@/app/[locale]/_data/getSubscriptions", () => ({
  getSubscriptions: (...args: unknown[]) => mockGetSubscriptions(...args),
}));

vi.mock("@/app/[locale]/_data/getUserOrgs", () => ({
  getUserOrgs: (...args: unknown[]) => mockGetUserOrgs(...args),
}));

import { getPricingCatalog } from "@/app/[locale]/_data/getPricingCatalog";

const PLANS: Plan[] = [
  {
    id: "plan-basic",
    name: "Basic",
    description: "",
    context: "personal",
    tier: 2,
    interval: "month",
    price: {
      id: "price-basic",
      amount: 1900,
      displayAmount: 19,
      currency: "usd",
      localDisplayAmount: null,
      localCurrency: null,
      taxInclusive: false,
    },
  },
];

const PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "100 Credits",
    type: "one_time",
    credits: 100,
    price: {
      id: "price-prod-1",
      amount: 999,
      displayAmount: 9.99,
      currency: "usd",
      localDisplayAmount: null,
      localCurrency: null,
      taxInclusive: false,
    },
  },
];

const SUBSCRIPTIONS: Subscription[] = [];

const ORGS: Org[] = [
  {
    id: "org-1",
    name: "ACME",
    slug: "acme",
    logoUrl: null,
    createdAt: "2024-01-01T00:00:00Z",
  },
];

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "alice@example.com",
    fullName: "Alice",
    avatarUrl: null,
    preferredLocale: "en",
    preferredCurrency: "usd",
    phonePrefix: null,
    phone: null,
    timezone: null,
    jobTitle: null,
    pronouns: null,
    bio: null,
    isVerified: true,
    registrationMethod: "email",
    linkedProviders: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPlans.mockResolvedValue(PLANS);
  mockGetProducts.mockResolvedValue(PRODUCTS);
  mockGetSubscriptions.mockResolvedValue(SUBSCRIPTIONS);
  mockGetUserOrgs.mockResolvedValue(ORGS);
});

describe("getPricingCatalog", () => {
  describe("authenticated user (user !== null)", () => {
    it("calls all four fetchers and returns their combined result", async () => {
      const user = makeUser();
      const result = await getPricingCatalog(user);
      expect(result).toEqual({
        plans: PLANS,
        subscriptions: SUBSCRIPTIONS,
        products: PRODUCTS,
        userOrgs: ORGS,
      });
    });

    it("passes user.preferredCurrency to getPlans and getProducts when no explicit override", async () => {
      const user = makeUser({ preferredCurrency: "eur" });

      await getPricingCatalog(user);

      // No currencyOverride → falls back to user.preferredCurrency
      expect(mockGetPlans).toHaveBeenCalledWith("eur", undefined);
      expect(mockGetProducts).toHaveBeenCalledWith("eur", undefined);
    });

    it("passes currencyOverride to getPlans and getProducts when provided", async () => {
      const user = makeUser({ preferredCurrency: "eur" });

      await getPricingCatalog(user, undefined, "gbp");

      // Explicit override wins over user preference
      expect(mockGetPlans).toHaveBeenCalledWith("gbp", undefined);
      expect(mockGetProducts).toHaveBeenCalledWith("gbp", undefined);
    });

    it("passes country to getPlans and getProducts", async () => {
      const user = makeUser({ preferredCurrency: "eur" });

      await getPricingCatalog(user, "ES");

      expect(mockGetPlans).toHaveBeenCalledWith("eur", "ES");
      expect(mockGetProducts).toHaveBeenCalledWith("eur", "ES");
    });

    it("passes currencyOverride + country together to getPlans and getProducts", async () => {
      const user = makeUser({ preferredCurrency: "eur" });

      await getPricingCatalog(user, "GB", "gbp");

      expect(mockGetPlans).toHaveBeenCalledWith("gbp", "GB");
      expect(mockGetProducts).toHaveBeenCalledWith("gbp", "GB");
    });

    it("passes user.preferredCurrency to getSubscriptions (not the override)", async () => {
      // Subscriptions are billed in the user's own currency — the catalog
      // currency override only drives the catalog display, not sub display.
      const user = makeUser({ preferredCurrency: "eur" });

      await getPricingCatalog(user, undefined, "gbp");

      expect(mockGetSubscriptions).toHaveBeenCalledWith("eur");
    });

    it("calls getSubscriptions and getUserOrgs for authenticated users", async () => {
      const user = makeUser();

      await getPricingCatalog(user);

      expect(mockGetSubscriptions).toHaveBeenCalled();
      expect(mockGetUserOrgs).toHaveBeenCalled();
    });
  });

  describe("anonymous user (user === null)", () => {
    it("skips authenticated fetchers and returns empty arrays for subscriptions, products, and orgs", async () => {
      const result = await getPricingCatalog(null);

      expect(mockGetSubscriptions).not.toHaveBeenCalled();
      expect(mockGetProducts).not.toHaveBeenCalled();
      expect(mockGetUserOrgs).not.toHaveBeenCalled();

      expect(result.subscriptions).toEqual([]);
      expect(result.products).toEqual([]);
      expect(result.userOrgs).toEqual([]);
    });

    it("still fetches plans for anonymous visitors", async () => {
      await getPricingCatalog(null);

      expect(mockGetPlans).toHaveBeenCalled();
      expect(mockGetPlans).toHaveBeenCalledWith(undefined, undefined);
    });

    it("passes country and currencyOverride to getPlans for anonymous visitors", async () => {
      await getPricingCatalog(null, "ES", "eur");

      expect(mockGetPlans).toHaveBeenCalledWith("eur", "ES");
    });

    it("returns plans from the gateway", async () => {
      const result = await getPricingCatalog(null);

      expect(result.plans).toBe(PLANS);
    });
  });
});
