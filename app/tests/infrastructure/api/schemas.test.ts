import { describe, it, expect } from "vitest";
import {
  InvitationSchema,
  OrgMemberSchema,
  OrgSchema,
  PhonePrefixSchema,
  PlanSchema,
  ProductSchema,
  SubscriptionSchema,
  UserSchema,
} from "@/infrastructure/api/schemas";

const validUser = {
  id: "u1",
  email: "alice@example.com",
  fullName: "Alice",
  avatarUrl: null,
  accountType: "personal",
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
  scheduledDeletionAt: null,
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
  quantity: 1,
  trialEndsAt: null,
  currentPeriodStart: "2024-01-01T00:00:00Z",
  currentPeriodEnd: "2024-02-01T00:00:00Z",
  canceledAt: null,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("UserSchema", () => {
  it("accepts a valid user", () => {
    expect(() => UserSchema.parse(validUser)).not.toThrow();
  });

  it("accepts the org_member account type", () => {
    const parsed = UserSchema.parse({
      ...validUser,
      accountType: "org_member",
    });
    expect(parsed.accountType).toBe("org_member");
  });

  it("rejects an unknown accountType", () => {
    expect(() =>
      UserSchema.parse({ ...validUser, accountType: "admin" }),
    ).toThrow();
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
});

describe("PhonePrefixSchema", () => {
  it("accepts a valid phone prefix", () => {
    expect(PhonePrefixSchema.parse({ prefix: "+1", label: "US" })).toEqual({
      prefix: "+1",
      label: "US",
    });
  });

  it("rejects when prefix is missing", () => {
    expect(() => PhonePrefixSchema.parse({ label: "US" })).toThrow();
  });

  it("rejects when label is not a string", () => {
    expect(() => PhonePrefixSchema.parse({ prefix: "+1", label: 1 })).toThrow();
  });
});
