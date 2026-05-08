import type { z } from "zod";
import type { Invitation, PublicInvitation } from "@/domain/models/Invitation";
import type { Org } from "@/domain/models/Org";
import type { OrgMember } from "@/domain/models/OrgMember";
import type { User } from "@/domain/models/User";
import { apiFetch } from "./apiClient";
import { flattenPhone, keysToCamel } from "./caseTransform";
import {
  InvitationSchema,
  OrgMemberSchema,
  OrgSchema,
  PublicInvitationSchema,
  UserSchema,
} from "./schemas";

export function parseUser(raw: Record<string, unknown>): User {
  const camel = keysToCamel(raw);
  flattenPhone(raw, camel);
  return UserSchema.parse(camel);
}

/**
 * Single source of truth for `GET /account/`. Both `IAuthGateway.getCurrentUser`
 * and `IUserGateway.getProfile` map to this endpoint, so they share an
 * implementation rather than duplicating the apiFetch + parse pair.
 */
export async function fetchCurrentUser(): Promise<User> {
  const raw = await apiFetch<Record<string, unknown>>("/account/");
  return parseUser(raw);
}

/**
 * Factory for the standard "snake-case JSON → camelCase domain object via
 * Zod" parse pattern. Use directly for any gateway whose response doesn't
 * need extra reshaping (User has its own parser because of `flattenPhone`).
 */
export function makeParser<T>(
  schema: z.ZodType<T>,
): (raw: Record<string, unknown>) => T {
  return (raw) => schema.parse(keysToCamel(raw));
}

export const parseOrg: (raw: Record<string, unknown>) => Org =
  makeParser(OrgSchema);
export const parseMember: (raw: Record<string, unknown>) => OrgMember =
  makeParser(OrgMemberSchema);
export const parseInvitation: (raw: Record<string, unknown>) => Invitation =
  makeParser(InvitationSchema);
export const parsePublicInvitation: (
  raw: Record<string, unknown>,
) => PublicInvitation = makeParser(PublicInvitationSchema);
