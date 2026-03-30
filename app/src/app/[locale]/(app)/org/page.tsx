import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import { authGateway, orgGateway } from "@/infrastructure/registry";
import { CreateOrgForm } from "./_components/CreateOrgForm";

export const metadata: Metadata = {
  title: "Organizations",
};

export default async function OrgListPage() {
  const [t, user] = await Promise.all([
    getTranslations("org"),
    new GetCurrentUser(authGateway).execute(),
  ]);
  const orgs = await new ListUserOrgs(orgGateway).execute(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>

      {orgs.length > 0 && (
        <ul className="space-y-3">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                href={`/org/${org.slug}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="font-medium text-gray-900">{org.name}</p>
                  <p className="text-sm text-gray-500">{org.slug}</p>
                </div>
              </Link>
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
