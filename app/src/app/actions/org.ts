"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { CreateInvitation } from "@/application/use-cases/invitation/CreateInvitation";
import { CancelInvitation } from "@/application/use-cases/invitation/CancelInvitation";
import { ListOrgMembers } from "@/application/use-cases/org-member/ListOrgMembers";
import { RemoveOrgMember } from "@/application/use-cases/org-member/RemoveOrgMember";
import { UpdateOrgMemberRole } from "@/application/use-cases/org-member/UpdateOrgMemberRole";
import { TransferOwnership } from "@/application/use-cases/org-member/TransferOwnership";
import { DeleteOrg } from "@/application/use-cases/org/DeleteOrg";
import {
  authGateway,
  invitationGateway,
  orgGateway,
  orgMemberGateway,
} from "@/infrastructure/registry";

const assignableRoles = ["admin", "member"] as const;
type AssignableRole = (typeof assignableRoles)[number];

export type OrgActionResult = { ok: true } | { ok: false; error: string };

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

  try {
    await new CreateInvitation(invitationGateway).execute(orgId, {
      email,
      role: role as AssignableRole,
    });
  } catch {
    return { ok: false, error: "Failed to send invitation" };
  }

  revalidatePath("/org");
  return { ok: true };
}

export async function cancelInvitation(formData: FormData) {
  const orgId = formData.get("orgId");
  const invitationId = formData.get("invitationId");

  if (typeof orgId !== "string" || typeof invitationId !== "string") {
    return;
  }

  try {
    await new CancelInvitation(invitationGateway).execute(orgId, invitationId);
  } catch (err) {
    console.error("Failed to cancel invitation", err);
    return;
  }
  revalidatePath("/org");
}

export async function removeMember(formData: FormData) {
  const orgId = formData.get("orgId");
  const userId = formData.get("userId");

  if (typeof orgId !== "string" || typeof userId !== "string") {
    return;
  }

  try {
    await new RemoveOrgMember(orgMemberGateway).execute(orgId, userId);
  } catch (err) {
    console.error("Failed to remove member", err);
    return;
  }
  revalidatePath("/org");
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
  revalidatePath("/org");
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

  try {
    await new TransferOwnership(orgMemberGateway).execute(orgId, userId);
  } catch {
    return { ok: false, error: "Failed to transfer ownership" };
  }

  revalidatePath("/org");
  return { ok: true };
}

export async function deleteOrg(formData: FormData) {
  const orgId = formData.get("orgId");

  if (typeof orgId !== "string") {
    return;
  }

  try {
    const user = await new GetCurrentUser(authGateway).execute();
    const members = await new ListOrgMembers(orgMemberGateway).execute(orgId);
    const me = members.find((m) => m.user.id === user.id);
    if (me?.role !== "owner") {
      console.error("Only the owner can delete the organization");
      return;
    }

    await new DeleteOrg(orgGateway).execute(orgId);
  } catch (err) {
    console.error("Failed to delete organization", err);
    return;
  }
  redirect("/dashboard");
}
