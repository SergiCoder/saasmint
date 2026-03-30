import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import { authGateway, orgGateway } from "@/infrastructure/registry";
import { MetricCard } from "@/presentation/components/molecules/MetricCard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tOrg = await getTranslations("org");
  const user = await new GetCurrentUser(authGateway).execute();
  const orgs = await new ListUserOrgs(orgGateway).execute(user.id);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t("uptime")}
          value="99.98%"
          change={{ value: "0.02%", positive: true }}
        />
        <MetricCard
          title={t("latency")}
          value="42ms"
          change={{ value: "3ms", positive: true }}
        />
        <MetricCard
          title={t("requests")}
          value="1.2M"
          change={{ value: "12%", positive: true }}
        />
        <MetricCard
          title={t("errors")}
          value="0.03%"
          change={{ value: "0.01%", positive: false }}
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">{tOrg("title")}</h2>
        {orgs.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            <Link
              href="/org"
              className="text-primary-600 hover:text-primary-500 font-medium"
            >
              {tOrg("create")}
            </Link>
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/org/${org.slug}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <p className="font-medium text-gray-900">{org.name}</p>
                  <p className="text-sm text-gray-500">{org.slug}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
