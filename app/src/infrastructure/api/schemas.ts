import { z } from "zod";
import type { Invitation } from "@/domain/models/Invitation";
import type { Org } from "@/domain/models/Org";
import type { OrgMember } from "@/domain/models/OrgMember";
import type { PhonePrefix } from "@/domain/models/PhonePrefix";
import type { Plan } from "@/domain/models/Plan";
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
  accountType: z.enum(["personal", "org_member"]),
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
  scheduledDeletionAt: nullableString,
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

export const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  context: z.enum(["personal", "team"]),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
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
  canceledAt: nullableString,
  createdAt: z.string(),
}) satisfies z.ZodType<Subscription>;

export const PhonePrefixSchema = z.object({
  prefix: z.string(),
  label: z.string(),
}) satisfies z.ZodType<PhonePrefix>;
