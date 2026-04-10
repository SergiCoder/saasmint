"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CreateOrg } from "@/application/use-cases/org/CreateOrg";
import { AddOrgMember } from "@/application/use-cases/org-member/InviteOrgMember";
import { RemoveOrgMember } from "@/application/use-cases/org-member/RemoveOrgMember";
import { orgGateway, orgMemberGateway } from "@/infrastructure/registry";

export async function createOrg(_prevState: unknown, formData: FormData) {
  const name = formData.get("name");
  const slug = formData.get("slug");

  if (typeof name !== "string" || typeof slug !== "string") {
    return { error: "Name and slug are required" };
  }

  let org;
  try {
    org = await new CreateOrg(orgGateway).execute({ name, slug });
  } catch {
    return { error: "Failed to create organization" };
  }
  redirect(`/org/${org.slug}`);
}

const validRoles = ["owner", "admin", "member"] as const;
type OrgRole = (typeof validRoles)[number];

export async function addMember(_prevState: unknown, formData: FormData) {
  const orgId = formData.get("orgId");
  const userId = formData.get("userId");
  const role = formData.get("role");

  if (
    typeof orgId !== "string" ||
    typeof userId !== "string" ||
    typeof role !== "string" ||
    !(validRoles as readonly string[]).includes(role)
  ) {
    return { error: "Invalid input" };
  }

  try {
    await new AddOrgMember(orgMemberGateway).execute(
      orgId,
      userId,
      role as OrgRole,
    );
  } catch {
    return { error: "Failed to add member" };
  }

  revalidatePath(`/org`);
  return { success: true };
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
  revalidatePath(`/org`);
}
