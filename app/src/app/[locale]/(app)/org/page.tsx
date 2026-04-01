import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import { orgGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../_data/getCurrentUser";
import { OrgCard } from "@/presentation/components/molecules/OrgCard";
import { CreateOrgForm } from "./_components/CreateOrgForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("org");
  return { title: t("title") };
}

export default async function OrgListPage() {
  const [t, user] = await Promise.all([
    getTranslations("org"),
    getCurrentUser(),
  ]);
  const orgs = await new ListUserOrgs(orgGateway).execute(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>

      {orgs.length > 0 && (
        <ul className="space-y-3">
          {orgs.map((org) => (
            <li key={org.id}>
              <OrgCard slug={org.slug} name={org.name} />
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t("create")}
        </h2>
        <CreateOrgForm />
      </section>
    </div>
  );
}
