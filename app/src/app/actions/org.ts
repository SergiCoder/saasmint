"use server";

import { revalidatePath } from "next/cache";
import { CreateInvitation } from "@/application/use-cases/invitation/CreateInvitation";
import { CancelInvitation } from "@/application/use-cases/invitation/CancelInvitation";
import { RemoveOrgMember } from "@/application/use-cases/org-member/RemoveOrgMember";
import { UpdateOrgMemberRole } from "@/application/use-cases/org-member/UpdateOrgMemberRole";
import { TransferOwnership } from "@/application/use-cases/org-member/TransferOwnership";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { ListOrgMembers } from "@/application/use-cases/org-member/ListOrgMembers";
import {
  authGateway,
  invitationGateway,
  orgMemberGateway,
} from "@/infrastructure/registry";
import type { OrgMember } from "@/domain/models/OrgMember";

const assignableRoles = ["admin", "member"] as const;
type AssignableRole = (typeof assignableRoles)[number];

export type OrgActionResult = { ok: true } | { ok: false; error: string };

type OrgRole = OrgMember["role"];

async function assertOrgRole(
  orgId: string,
  allowed: readonly OrgRole[],
): Promise<boolean> {
  try {
    const [user, members] = await Promise.all([
      new GetCurrentUser(authGateway).execute(),
      new ListOrgMembers(orgMemberGateway).execute(orgId),
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
): Promise<OrgActionResult> {
  const orgId = formData.get("orgId");
  const email = formData.get("email");
  const role = formData.get("role");

  if (
    typeof orgId !== "string" ||
    typeof email !== "string" ||
    typeof role !== "string" ||
    !(assignableRoles as readonly string[]).includes(role)
  ) {
    return { ok: false, error: "Invalid input" };
  }

  if (!(await assertOrgRole(orgId, ["owner", "admin"]))) {
    return { ok: false, error: "Not authorized" };
  }

  try {
    await new CreateInvitation(invitationGateway).execute(orgId, {
      email,
      role: role as AssignableRole,
    });
  } catch {
    return { ok: false, error: "Failed to send invitation" };
  }

  revalidatePath("/[locale]/org", "layout");
  return { ok: true };
}

export async function cancelInvitation(formData: FormData) {
  const orgId = formData.get("orgId");
  const invitationId = formData.get("invitationId");

  if (typeof orgId !== "string" || typeof invitationId !== "string") {
    return;
  }

  if (!(await assertOrgRole(orgId, ["owner", "admin"]))) {
    return;
  }

  try {
    await new CancelInvitation(invitationGateway).execute(orgId, invitationId);
  } catch (err) {
    console.error("Failed to cancel invitation", err);
    return;
  }
  revalidatePath("/[locale]/org", "layout");
}

export async function removeMember(formData: FormData) {
  const orgId = formData.get("orgId");
  const userId = formData.get("userId");

  if (typeof orgId !== "string" || typeof userId !== "string") {
    return;
  }

  if (!(await assertOrgRole(orgId, ["owner", "admin"]))) {
    return;
  }

  try {
    await new RemoveOrgMember(orgMemberGateway).execute(orgId, userId);
  } catch (err) {
    console.error("Failed to remove member", err);
    return;
  }
  revalidatePath("/[locale]/org", "layout");
}

export async function updateMemberRole(formData: FormData) {
  const orgId = formData.get("orgId");
  const userId = formData.get("userId");
  const role = formData.get("role");

  if (
    typeof orgId !== "string" ||
    typeof userId !== "string" ||
    typeof role !== "string" ||
    !(assignableRoles as readonly string[]).includes(role)
  ) {
    return;
  }

  if (!(await assertOrgRole(orgId, ["owner", "admin"]))) {
    return;
  }

  try {
    await new UpdateOrgMemberRole(orgMemberGateway).execute(
      orgId,
      userId,
      role as AssignableRole,
    );
  } catch (err) {
    console.error("Failed to update member role", err);
    return;
  }
  revalidatePath("/[locale]/org", "layout");
}

export async function transferOwnership(
  _prevState: unknown,
  formData: FormData,
): Promise<OrgActionResult> {
  const orgId = formData.get("orgId");
  const userId = formData.get("userId");

  if (typeof orgId !== "string" || typeof userId !== "string") {
    return { ok: false, error: "Invalid input" };
  }

  if (!(await assertOrgRole(orgId, ["owner"]))) {
    return { ok: false, error: "Not authorized" };
  }

  try {
    await new TransferOwnership(orgMemberGateway).execute(orgId, userId);
  } catch {
    return { ok: false, error: "Failed to transfer ownership" };
  }

  revalidatePath("/[locale]/org", "layout");
  return { ok: true };
}
