"use server";

import type { OrgMember } from "@/domain/models/OrgMember";
import {
  invitationGateway,
  orgGateway,
  orgMemberGateway,
} from "@/infrastructure/registry";
import {
  ACTION_CODE_INVALID_INPUT,
  ACTION_CODE_NOT_AUTHORIZED,
  ok,
  fail,
  toActionError,
  type ActionResult,
} from "@/lib/actions/ActionResult";
import { getString } from "@/lib/actions/parseFormData";
import { getCurrentUserIdFromCookie } from "@/lib/jwt";
import { revalidateLocalizedPath } from "@/lib/revalidate";
import { isMemberOf } from "@/lib/typeGuards";

const assignableRoles = ["admin", "member"] as const;
type AssignableRole = (typeof assignableRoles)[number];

function isAssignableRole(value: unknown): value is AssignableRole {
  return isMemberOf(assignableRoles, value);
}

type OrgRole = OrgMember["role"];

async function assertOrgRole(
  orgId: string,
  allowed: readonly OrgRole[],
): Promise<boolean> {
  // Read the user ID directly from the JWT cookie to avoid a full
  // GET /account/ round-trip on every org mutation. The middleware has
  // already vetted token expiry; the backend re-validates membership.
  const userId = await getCurrentUserIdFromCookie();
  if (!userId) return false;
  try {
    const members = await orgMemberGateway.listMembers(orgId);
    const me = members.find((m) => m.user.id === userId);
    return me ? allowed.includes(me.role) : false;
  } catch {
    return false;
  }
}

export async function inviteMember(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const orgId = getString(formData, "orgId");
  const email = getString(formData, "email");
  const role = formData.get("role");

  if (!orgId || !email || !isAssignableRole(role)) {
    return fail(ACTION_CODE_INVALID_INPUT);
  }

  if (!(await assertOrgRole(orgId, ["owner", "admin"]))) {
    return fail(ACTION_CODE_NOT_AUTHORIZED);
  }

  try {
    await invitationGateway.createInvitation(orgId, { email, role });
  } catch (err) {
    return toActionError(err);
  }

  revalidateLocalizedPath("/org", "layout");
  return ok();
}

// Fire-and-forget variants: consumed via `<form action={fn}>` which requires
// `Promise<void>`. Errors are logged server-side and the page re-renders via
// `revalidatePath`; there's no UI surface to show per-action envelopes here.
export async function cancelInvitation(formData: FormData): Promise<void> {
  const orgId = getString(formData, "orgId");
  const invitationId = getString(formData, "invitationId");
  if (!orgId || !invitationId) return;
  if (!(await assertOrgRole(orgId, ["owner", "admin"]))) return;
  try {
    await invitationGateway.cancelInvitation(orgId, invitationId);
  } catch (err) {
    console.error("Failed to cancel invitation", err);
    return;
  }
  revalidateLocalizedPath("/org", "layout");
}

export async function removeMember(formData: FormData): Promise<void> {
  const orgId = getString(formData, "orgId");
  const userId = getString(formData, "userId");
  if (!orgId || !userId) return;
  if (!(await assertOrgRole(orgId, ["owner", "admin"]))) return;
  try {
    await orgMemberGateway.removeMember(orgId, userId);
  } catch (err) {
    console.error("Failed to remove member", err);
    return;
  }
  revalidateLocalizedPath("/org", "layout");
}

export async function updateMemberRole(formData: FormData): Promise<void> {
  const orgId = getString(formData, "orgId");
  const userId = getString(formData, "userId");
  const role = formData.get("role");
  if (!orgId || !userId || !isAssignableRole(role)) return;
  if (!(await assertOrgRole(orgId, ["owner", "admin"]))) return;
  try {
    await orgMemberGateway.updateMemberRole(orgId, userId, role);
  } catch (err) {
    console.error("Failed to update member role", err);
    return;
  }
  revalidateLocalizedPath("/org", "layout");
}

export async function transferOwnership(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const orgId = getString(formData, "orgId");
  const userId = getString(formData, "userId");

  if (!orgId || !userId) return fail(ACTION_CODE_INVALID_INPUT);

  if (!(await assertOrgRole(orgId, ["owner"]))) {
    return fail(ACTION_CODE_NOT_AUTHORIZED);
  }

  try {
    await orgMemberGateway.transferOwnership(orgId, userId);
  } catch (err) {
    return toActionError(err);
  }

  revalidateLocalizedPath("/org", "layout");
  return ok();
}

export async function deleteOrg(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const orgId = getString(formData, "orgId");

  if (!orgId) return fail(ACTION_CODE_INVALID_INPUT);

  if (!(await assertOrgRole(orgId, ["owner"]))) {
    return fail(ACTION_CODE_NOT_AUTHORIZED);
  }

  try {
    await orgGateway.deleteOrg(orgId);
  } catch (err) {
    console.error("Failed to delete org", err);
    return toActionError(err);
  }

  revalidateLocalizedPath("/", "layout");
  return ok();
}
