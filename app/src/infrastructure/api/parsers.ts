import type { User } from "@/domain/models/User";
import { flattenPhone, keysToCamel } from "./caseTransform";
import { UserSchema } from "./schemas";

export function parseUser(raw: Record<string, unknown>): User {
  const camel = keysToCamel(raw) as Record<string, unknown>;
  flattenPhone(raw, camel);
  return UserSchema.parse(camel);
}
