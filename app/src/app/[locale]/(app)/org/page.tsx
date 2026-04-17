import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../_data/getCurrentUser";
import { getUserOrgs } from "../_data/getUserOrgs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("org");
  return { title: t("title") };
}

export default async function OrgListPage() {
  const user = await getCurrentUser();
  const orgs = await getUserOrgs(user.id);

  if (orgs.length === 1 && orgs[0]) {
    redirect(`/org/${orgs[0].slug}`);
  }

  // No orgs — send the user to subscription page to pick a team plan
  redirect("/subscription");
}
