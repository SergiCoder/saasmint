"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CreateOrg } from "@/application/use-cases/org/CreateOrg";
import { InviteOrgMember } from "@/application/use-cases/org-member/InviteOrgMember";
import { RemoveOrgMember } from "@/application/use-cases/org-member/RemoveOrgMember";
import { orgGateway, orgMemberGateway } from "@/infrastructure/registry";

export async function createOrg(_prevState: unknown, formData: FormData) {
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  try {
    const org = await new CreateOrg(orgGateway).execute({ name, slug });
    redirect(`/org/${org.slug}`);
  } catch {
    return { error: "Failed to create organization" };
  }
}

export async function inviteMember(_prevState: unknown, formData: FormData) {
  const orgId = formData.get("orgId") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as "owner" | "admin" | "member";

  try {
    await new InviteOrgMember(orgMemberGateway).execute(orgId, email, role);
  } catch {
    return { error: "Failed to invite member" };
  }

  revalidatePath(`/org`);
  return { success: true };
}

export async function removeMember(formData: FormData) {
  const orgId = formData.get("orgId") as string;
  const userId = formData.get("userId") as string;

  await new RemoveOrgMember(orgMemberGateway).execute(orgId, userId);
  revalidatePath(`/org`);
}
