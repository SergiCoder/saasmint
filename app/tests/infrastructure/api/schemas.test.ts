import { describe, it, expect } from "vitest";
import {
  CreditBalanceListResponseSchema,
  CreditBalanceSchema,
  InvitationSchema,
  OrgMemberSchema,
  OrgSchema,
  PlanSchema,
  ProductSchema,
  SubscriptionListResponseSchema,
  SubscriptionSchema,
  UserSchema,
} from "@/infrastructure/api/schemas";

const validUser = {
  id: "u1",
  email: "alice@example.com",
  fullName: "Alice",
  avatarUrl: null,
  preferredLocale: "en",
  preferredCurrency: "USD",
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
};

const validOrg = {
  id: "o1",
  name: "Acme",
  slug: "acme",
  logoUrl: null,
  createdAt: "2024-01-01T00:00:00Z",
};

const validOrgMember = {
  id: "m1",
  org: "o1",
  user: {
    id: "u1",
    email: "alice@example.com",
    fullName: "Alice",
    avatarUrl: null,
  },
  role: "member",
  isBilling: false,
  joinedAt: "2024-01-01T00:00:00Z",
};

const validInvitation = {
  id: "i1",
  org: "o1",
  orgName: "Acme",
  email: "new@example.com",
  role: "member",
  status: "pending",
  invitedBy: {
    id: "u1",
    email: "alice@example.com",
    fullName: "Alice",
  },
  createdAt: "2024-01-01T00:00:00Z",
  expiresAt: "2024-01-08T00:00:00Z",
};

const validPlan = {
  id: "plan_pro",
  name: "Pro",
  description: "Pro plan",
  context: "personal",
  tier: 3,
  interval: "month",
  price: {
    id: "pp1",
    amount: 1900,
    displayAmount: 19,
    currency: "usd",
  },
};

const validProduct = {
  id: "prod_1",
  name: "Credits pack",
  type: "one_time",
  credits: 100,
  price: {
    id: "pp2",
    amount: 500,
    displayAmount: 5,
    currency: "usd",
  },
};

const validSubscription = {
  id: "sub_1",
  status: "active",
  plan: validPlan,
  seatLimit: 1,
  seatsUsed: 1,
  trialEndsAt: null,
  currentPeriodStart: "2024-01-01T00:00:00Z",
  currentPeriodEnd: "2024-02-01T00:00:00Z",
  cancelAt: null,
  canceledAt: null,
  scheduledPlan: null,
  scheduledChangeAt: null,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("UserSchema", () => {
  it("accepts a valid user", () => {
    expect(() => UserSchema.parse(validUser)).not.toThrow();
  });

  it("rejects an unknown registrationMethod", () => {
    expect(() =>
      UserSchema.parse({ ...validUser, registrationMethod: "facebook" }),
    ).toThrow();
  });

  it("rejects when a required string field is missing", () => {
    const { id: _id, ...withoutId } = validUser;
    expect(() => UserSchema.parse(withoutId)).toThrow();
  });

  it("rejects when isVerified is not a boolean", () => {
    expect(() =>
      UserSchema.parse({ ...validUser, isVerified: "yes" }),
    ).toThrow();
  });

  it("rejects when linkedProviders contains non-strings", () => {
    expect(() =>
      UserSchema.parse({ ...validUser, linkedProviders: [1, 2] }),
    ).toThrow();
  });

  it("accepts all known registration methods", () => {
    for (const method of ["email", "google", "github", "microsoft"]) {
      expect(() =>
        UserSchema.parse({ ...validUser, registrationMethod: method }),
      ).not.toThrow();
    }
  });

  it("accepts a payload that lacks accountType (forward-compat with the dropped field)", () => {
    // The accountType field was removed from User/UserSchema. Backends on the
    // matching version no longer send it; the schema must accept the leaner
    // payload without complaining.
    expect(() => UserSchema.parse(validUser)).not.toThrow();
    const parsed = UserSchema.parse(validUser);
    expect(parsed).not.toHaveProperty("accountType");
  });

  it("strips an unexpected accountType field from older backend responses", () => {
    // Backward-compat: a server that still returns accountType (mid-rollout
    // or a stale instance) must not break parsing — Zod's default strips
    // unknown keys so the field is silently dropped.
    const parsed = UserSchema.parse({
      ...validUser,
      accountType: "personal",
    });
    expect(parsed).not.toHaveProperty("accountType");
  });
});

describe("OrgSchema", () => {
  it("accepts a valid org", () => {
    expect(OrgSchema.parse(validOrg)).toEqual(validOrg);
  });

  it("accepts a logoUrl string", () => {
    const parsed = OrgSchema.parse({ ...validOrg, logoUrl: "https://x/y.png" });
    expect(parsed.logoUrl).toBe("https://x/y.png");
  });

  it("rejects when slug is missing", () => {
    const { slug: _slug, ...withoutSlug } = validOrg;
    expect(() => OrgSchema.parse(withoutSlug)).toThrow();
  });
});

describe("OrgMemberSchema", () => {
  it("accepts a valid org member", () => {
    expect(() => OrgMemberSchema.parse(validOrgMember)).not.toThrow();
  });

  it("rejects an unknown role", () => {
    expect(() =>
      OrgMemberSchema.parse({ ...validOrgMember, role: "superuser" }),
    ).toThrow();
  });

  it("accepts the owner, admin, and member roles", () => {
    for (const role of ["owner", "admin", "member"]) {
      expect(() =>
        OrgMemberSchema.parse({ ...validOrgMember, role }),
      ).not.toThrow();
    }
  });

  it("rejects when user.fullName is missing", () => {
    expect(() =>
      OrgMemberSchema.parse({
        ...validOrgMember,
        user: {
          id: "u1",
          email: "a@b.c",
          avatarUrl: null,
        },
      }),
    ).toThrow();
  });
});

describe("InvitationSchema", () => {
  it("accepts a valid invitation", () => {
    expect(() => InvitationSchema.parse(validInvitation)).not.toThrow();
  });

  it("accepts each known status", () => {
    for (const status of [
      "pending",
      "accepted",
      "expired",
      "cancelled",
      "declined",
    ]) {
      expect(() =>
        InvitationSchema.parse({ ...validInvitation, status }),
      ).not.toThrow();
    }
  });

  it("rejects the owner role for invitations (only admin/member allowed)", () => {
    expect(() =>
      InvitationSchema.parse({ ...validInvitation, role: "owner" }),
    ).toThrow();
  });

  it("rejects an unknown status", () => {
    expect(() =>
      InvitationSchema.parse({ ...validInvitation, status: "revoked" }),
    ).toThrow();
  });
});

describe("PlanSchema", () => {
  it("accepts a valid plan", () => {
    expect(() => PlanSchema.parse(validPlan)).not.toThrow();
  });

  it("accepts a null price", () => {
    const parsed = PlanSchema.parse({ ...validPlan, price: null });
    expect(parsed.price).toBeNull();
  });

  it("rejects a tier outside 1|2|3", () => {
    expect(() => PlanSchema.parse({ ...validPlan, tier: 4 })).toThrow();
    expect(() => PlanSchema.parse({ ...validPlan, tier: 0 })).toThrow();
  });

  it("maps Django's string tiers (free/basic/pro) to numeric PlanTier", () => {
    expect(PlanSchema.parse({ ...validPlan, tier: "free" }).tier).toBe(1);
    expect(PlanSchema.parse({ ...validPlan, tier: "basic" }).tier).toBe(2);
    expect(PlanSchema.parse({ ...validPlan, tier: "pro" }).tier).toBe(3);
    expect(() =>
      PlanSchema.parse({ ...validPlan, tier: "enterprise" }),
    ).toThrow();
  });

  it("rejects an unknown interval", () => {
    expect(() =>
      PlanSchema.parse({ ...validPlan, interval: "week" }),
    ).toThrow();
  });

  it("rejects an unknown context", () => {
    expect(() =>
      PlanSchema.parse({ ...validPlan, context: "enterprise" }),
    ).toThrow();
  });
});

describe("ProductSchema", () => {
  it("accepts a valid one_time product", () => {
    expect(() => ProductSchema.parse(validProduct)).not.toThrow();
  });

  it("rejects a non one_time type", () => {
    expect(() =>
      ProductSchema.parse({ ...validProduct, type: "subscription" }),
    ).toThrow();
  });

  it("accepts a null price", () => {
    const parsed = ProductSchema.parse({ ...validProduct, price: null });
    expect(parsed.price).toBeNull();
  });

  it("rejects when credits is not a number", () => {
    expect(() =>
      ProductSchema.parse({ ...validProduct, credits: "100" }),
    ).toThrow();
  });
});

describe("SubscriptionSchema", () => {
  it("accepts a valid subscription", () => {
    expect(() => SubscriptionSchema.parse(validSubscription)).not.toThrow();
  });

  it("accepts each known status", () => {
    for (const status of [
      "active",
      "trialing",
      "past_due",
      "canceled",
      "unpaid",
      "incomplete",
      "incomplete_expired",
      "paused",
    ]) {
      expect(() =>
        SubscriptionSchema.parse({ ...validSubscription, status }),
      ).not.toThrow();
    }
  });

  it("rejects an unknown status", () => {
    expect(() =>
      SubscriptionSchema.parse({
        ...validSubscription,
        status: "grace_period",
      }),
    ).toThrow();
  });

  it("rejects when plan is invalid", () => {
    expect(() =>
      SubscriptionSchema.parse({
        ...validSubscription,
        plan: { ...validPlan, tier: 99 },
      }),
    ).toThrow();
  });

  it("accepts a non-null cancelAt timestamp (scheduled-to-cancel state)", () => {
    // Backend mirrors Stripe's `cancel_at` (Dahlia field): set the moment the
    // user clicks cancel-renewal. Schema must round-trip the ISO string so the
    // CurrentSubscriptionCard can render the "Cancels on" date row.
    const parsed = SubscriptionSchema.parse({
      ...validSubscription,
      cancelAt: "2026-03-15T00:00:00Z",
    });
    expect(parsed.cancelAt).toBe("2026-03-15T00:00:00Z");
  });

  it("rejects when cancelAt is not a string or null", () => {
    expect(() =>
      SubscriptionSchema.parse({ ...validSubscription, cancelAt: 123 }),
    ).toThrow();
  });

  it("rejects when cancelAt is missing entirely (required field)", () => {
    const { cancelAt: _drop, ...withoutCancelAt } = validSubscription;
    expect(() => SubscriptionSchema.parse(withoutCancelAt)).toThrow();
  });
});

describe("CreditBalanceSchema", () => {
  it("accepts a valid user-scoped balance", () => {
    expect(CreditBalanceSchema.parse({ balance: 142, scope: "user" })).toEqual({
      balance: 142,
      scope: "user",
    });
  });

  it("accepts a zero balance", () => {
    expect(() =>
      CreditBalanceSchema.parse({ balance: 0, scope: "org" }),
    ).not.toThrow();
  });

  it("rejects negative balances (DB has a non-negative constraint)", () => {
    expect(() =>
      CreditBalanceSchema.parse({ balance: -1, scope: "user" }),
    ).toThrow();
  });

  it("rejects non-integer balances", () => {
    expect(() =>
      CreditBalanceSchema.parse({ balance: 1.5, scope: "user" }),
    ).toThrow();
  });

  it("rejects an unknown scope value", () => {
    expect(() =>
      CreditBalanceSchema.parse({ balance: 10, scope: "global" }),
    ).toThrow();
  });

  it("rejects when balance is not a number", () => {
    expect(() =>
      CreditBalanceSchema.parse({ balance: "10", scope: "user" }),
    ).toThrow();
  });
});

describe("CreditBalanceListResponseSchema", () => {
  it("accepts an empty list (free-tier user)", () => {
    expect(() =>
      CreditBalanceListResponseSchema.parse({ balances: [] }),
    ).not.toThrow();
  });

  it("accepts a single-row envelope", () => {
    const parsed = CreditBalanceListResponseSchema.parse({
      balances: [{ balance: 50, scope: "user" }],
    });
    expect(parsed.balances).toHaveLength(1);
    expect(parsed.balances[0]).toEqual({ balance: 50, scope: "user" });
  });

  it("accepts a two-row envelope (concurrent personal+team — rule 5)", () => {
    const parsed = CreditBalanceListResponseSchema.parse({
      balances: [
        { balance: 500, scope: "org" },
        { balance: 75, scope: "user" },
      ],
    });
    expect(parsed.balances.map((b) => b.scope)).toEqual(["org", "user"]);
  });

  it("rejects when balances is missing", () => {
    expect(() => CreditBalanceListResponseSchema.parse({})).toThrow();
  });

  it("rejects when a row in balances fails CreditBalanceSchema validation", () => {
    expect(() =>
      CreditBalanceListResponseSchema.parse({
        balances: [{ balance: -1, scope: "user" }],
      }),
    ).toThrow();
  });

  it("rejects a flat (un-enveloped) balance object", () => {
    // Pre-refactor shape — the gateway must NOT silently accept a single
    // object that wasn't wrapped in `{ balances: [...] }`.
    expect(() =>
      CreditBalanceListResponseSchema.parse({ balance: 50, scope: "user" }),
    ).toThrow();
  });
});

describe("SubscriptionListResponseSchema", () => {
  it("accepts an empty results array (free-tier user, replaces the prior 404)", () => {
    expect(() =>
      SubscriptionListResponseSchema.parse({
        count: 0,
        next: null,
        previous: null,
        results: [],
      }),
    ).not.toThrow();
  });

  it("accepts a single-row envelope", () => {
    const parsed = SubscriptionListResponseSchema.parse({
      count: 1,
      next: null,
      previous: null,
      results: [validSubscription],
    });
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0]?.id).toBe("sub_1");
  });

  it("accepts a two-row envelope (concurrent personal+team — rule 5)", () => {
    const teamSub = {
      ...validSubscription,
      id: "sub_2",
      plan: { ...validPlan, id: "plan_team", context: "team" },
    };
    const parsed = SubscriptionListResponseSchema.parse({
      count: 2,
      next: null,
      previous: null,
      results: [validSubscription, teamSub],
    });
    expect(parsed.results.map((s) => s.plan.context)).toEqual([
      "personal",
      "team",
    ]);
  });

  it("accepts string next/previous cursors (paginated envelope shape)", () => {
    expect(() =>
      SubscriptionListResponseSchema.parse({
        count: 3,
        next: "https://api.example.com/billing/subscriptions/me/?page=2",
        previous: null,
        results: [validSubscription],
      }),
    ).not.toThrow();
  });

  it("rejects when results is missing", () => {
    expect(() =>
      SubscriptionListResponseSchema.parse({
        count: 0,
        next: null,
        previous: null,
      }),
    ).toThrow();
  });

  it("rejects when count is not a number", () => {
    expect(() =>
      SubscriptionListResponseSchema.parse({
        count: "0",
        next: null,
        previous: null,
        results: [],
      }),
    ).toThrow();
  });

  it("rejects when a row in results fails SubscriptionSchema validation", () => {
    expect(() =>
      SubscriptionListResponseSchema.parse({
        count: 1,
        next: null,
        previous: null,
        results: [{ ...validSubscription, status: "grace_period" }],
      }),
    ).toThrow();
  });
});

