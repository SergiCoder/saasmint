import { z } from "zod";
import { isRecord } from "@/lib/typeGuards";
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
  PaginatedResultsSchema,
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
  const raw = await apiFetch("/account/");
  return parseUser(raw);
}

/**
 * Factory for the standard "snake-case JSON → camelCase domain object via
 * Zod" parse pattern. Use directly for any gateway whose response doesn't
 * need extra reshaping (User has its own parser because of `flattenPhone`).
 *
 * `T` is constrained to `object` because every domain model is struct-shaped
 * — primitives would never round-trip through `keysToCamel` meaningfully and
 * the constraint catches misuse at compile time.
 */
export function makeParser<T extends object>(
  schema: z.ZodType<T>,
): (raw: Record<string, unknown>) => T {
  return (raw) => schema.parse(keysToCamel(raw));
}

/**
 * Validate a DRF-style paginated envelope and parse each row through the
 * caller's per-item parser. Centralises the `{ results: [...] }` shape check
 * so list-endpoint gateways don't have to trust the cast `apiFetch<{
 * results: ... }>` would otherwise rely on.
 */
export function parsePaginated<T>(
  raw: Record<string, unknown>,
  parseItem: (item: Record<string, unknown>) => T,
): T[] {
  const { results } = PaginatedResultsSchema.parse(raw);
  return results.map((item) => {
    if (!isRecord(item)) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["results"],
          message: "Expected each result to be an object",
          input: item,
        },
      ]);
    }
    return parseItem(item);
  });
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
