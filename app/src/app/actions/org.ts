"use server";

import { revalidatePath } from "next/cache";
import type { OrgMember } from "@/domain/models/OrgMember";
import {
  authGateway,
  invitationGateway,
  orgMemberGateway,
} from "@/infrastructure/registry";
import {
  ok,
  fail,
  toActionError,
  type ActionResult,
} from "@/lib/actions/ActionResult";
import { getString } from "@/lib/actions/parseFormData";

const assignableRoles = ["admin", "member"] as const;
type AssignableRole = (typeof assignableRoles)[number];

function isAssignableRole(value: unknown): value is AssignableRole {
  return (
    typeof value === "string" &&
    (assignableRoles as readonly string[]).includes(value)
  );
}

type OrgRole = OrgMember["role"];

async function assertOrgRole(
  orgId: string,
  allowed: readonly OrgRole[],
): Promise<boolean> {
  try {
    const [user, members] = await Promise.all([
      authGateway.getCurrentUser(),
      orgMemberGateway.listMembers(orgId),
    ]);
    const me = members.find((m) => m.user.id === user.id);
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
    return fail("invalid_input");
  }

  if (!(await assertOrgRole(orgId, ["owner", "admin"]))) {
    return fail("not_authorized");
  }

  try {
    await invitationGateway.createInvitation(orgId, { email, role });
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/org", "layout");
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
  revalidatePath("/org", "layout");
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
  revalidatePath("/org", "layout");
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
  revalidatePath("/org", "layout");
}

export async function transferOwnership(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const orgId = getString(formData, "orgId");
  const userId = getString(formData, "userId");

  if (!orgId || !userId) return fail("invalid_input");

  if (!(await assertOrgRole(orgId, ["owner"]))) {
    return fail("not_authorized");
  }

  try {
    await orgMemberGateway.transferOwnership(orgId, userId);
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/org", "layout");
  return ok();
}
