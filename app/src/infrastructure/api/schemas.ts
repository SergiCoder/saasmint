import { z } from "zod";
import type { CreditBalance } from "@/domain/models/CreditBalance";
import type { Invitation } from "@/domain/models/Invitation";
import type { Org } from "@/domain/models/Org";
import type { OrgMember } from "@/domain/models/OrgMember";
import type { PhonePrefix } from "@/domain/models/PhonePrefix";
import {
  PLAN_TIER_BASIC,
  PLAN_TIER_FREE,
  PLAN_TIER_PRO,
  type Plan,
  type PlanTier,
} from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";
import type { Subscription } from "@/domain/models/Subscription";
import type { User } from "@/domain/models/User";

const nullableString = z.string().nullable();

const priceSchema = z.object({
  id: z.string(),
  amount: z.number(),
  displayAmount: z.number(),
  currency: z.string(),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  avatarUrl: nullableString,
  preferredLocale: z.string(),
  preferredCurrency: z.string(),
  phonePrefix: nullableString,
  phone: nullableString,
  timezone: nullableString,
  jobTitle: nullableString,
  pronouns: nullableString,
  bio: nullableString,
  isVerified: z.boolean(),
  registrationMethod: z.enum(["email", "google", "github", "microsoft"]),
  linkedProviders: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<User>;

export const OrgSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: nullableString,
  createdAt: z.string(),
}) satisfies z.ZodType<Org>;

export const OrgMemberSchema = z.object({
  id: z.string(),
  org: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    fullName: z.string(),
    avatarUrl: nullableString,
  }),
  role: z.enum(["owner", "admin", "member"]),
  isBilling: z.boolean(),
  joinedAt: z.string(),
}) satisfies z.ZodType<OrgMember>;

export const InvitationSchema = z.object({
  id: z.string(),
  org: z.string(),
  orgName: z.string(),
  email: z.string(),
  role: z.enum(["admin", "member"]),
  status: z.enum(["pending", "accepted", "expired", "cancelled", "declined"]),
  invitedBy: z.object({
    id: z.string(),
    email: z.string(),
    fullName: z.string(),
  }),
  createdAt: z.string(),
  expiresAt: z.string(),
}) satisfies z.ZodType<Invitation>;

const TIER_STRING_TO_NUMBER: Record<string, PlanTier> = {
  free: PLAN_TIER_FREE,
  basic: PLAN_TIER_BASIC,
  pro: PLAN_TIER_PRO,
};

export const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  context: z.enum(["personal", "team"]),
  tier: z.preprocess(
    (v) => (typeof v === "string" ? (TIER_STRING_TO_NUMBER[v] ?? v) : v),
    z.union([z.literal(1), z.literal(2), z.literal(3)]),
  ),
  interval: z.enum(["month", "year"]),
  price: priceSchema.nullable(),
}) satisfies z.ZodType<Plan>;

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal("one_time"),
  credits: z.number(),
  price: priceSchema.nullable(),
}) satisfies z.ZodType<Product>;

export const SubscriptionSchema = z.object({
  id: z.string(),
  status: z.enum([
    "active",
    "trialing",
    "past_due",
    "canceled",
    "unpaid",
    "incomplete",
    "incomplete_expired",
    "paused",
  ]),
  plan: PlanSchema,
  quantity: z.number(),
  trialEndsAt: nullableString,
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  cancelAt: nullableString,
  canceledAt: nullableString,
  scheduledPlan: PlanSchema.nullable(),
  scheduledChangeAt: nullableString,
  createdAt: z.string(),
}) satisfies z.ZodType<Subscription>;

/**
 * Backend's paginated envelope for `GET /billing/subscriptions/me/`. The list
 * holds 0–2 rows (free tier, single sub, or concurrent personal+team per
 * rule 5). Empty `results` replaces the prior `404 Not Found` for free-tier
 * users — gateway no longer special-cases 404 on this endpoint.
 */
export const SubscriptionListResponseSchema = z.object({
  count: z.number(),
  next: nullableString,
  previous: nullableString,
  results: z.array(SubscriptionSchema),
});

export const PhonePrefixSchema = z.object({
  prefix: z.string(),
  label: z.string(),
}) satisfies z.ZodType<PhonePrefix>;

export const CreditBalanceSchema = z.object({
  balance: z.number().int().nonnegative(),
  scope: z.enum(["user", "org"]),
}) satisfies z.ZodType<CreditBalance>;

/**
 * Envelope returned by `GET /billing/credits/me/`. Holds 0–2 rows: free-tier
 * users get `[]`, single-context users get one row, and concurrent
 * personal+team billers (rule 5) get both — one `user`-scoped, one `org`-scoped.
 */
export const CreditBalanceListResponseSchema = z.object({
  balances: z.array(CreditBalanceSchema),
});

/**
 * Envelope returned by Stripe-session-creating endpoints (plan checkout,
 * product checkout, billing portal). Validates that `url` is a well-formed
 * URL at the boundary so gateway callers never hand a malformed string to
 * `redirect(...)` or `assertTrustedRedirect(...)`.
 */
export const CheckoutSessionResponseSchema = z.object({
  url: z.string().url(),
});
