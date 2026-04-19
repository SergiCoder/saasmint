import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../_data/getCurrentUser";
import { getUserOrgs } from "../_data/getUserOrgs";
import { OrgCard } from "@/presentation/components/molecules/OrgCard";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "org" });
  return { title: t("title") };
}

export default async function OrgListPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const [t, orgs] = await Promise.all([
    getTranslations("org"),
    getUserOrgs(user.id),
  ]);

  if (orgs.length === 0) {
    redirect("/subscription");
  }

  if (orgs.length === 1 && orgs[0]) {
    redirect(`/org/${orgs[0].slug}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orgs.map((org) => (
          <li key={org.id}>
            <OrgCard slug={org.slug} name={org.name} />
          </li>
        ))}
      </ul>
    </div>
  );
}
