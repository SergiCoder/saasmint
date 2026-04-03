import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import { orgGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../_data/getCurrentUser";
import { MetricCard } from "@/presentation/components/molecules/MetricCard";
import { OrgCard } from "@/presentation/components/molecules/OrgCard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const [t, tOrg, user] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("org"),
    getCurrentUser(),
  ]);
  const orgs = await new ListUserOrgs(orgGateway).execute(user.id);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t("uptime")}
          value="1,248"
          change={{ value: "12%", positive: true }}
        />
        <MetricCard
          title={t("latency")}
          value="$8.4k"
          change={{ value: "22%", positive: true }}
        />
        <MetricCard
          title={t("requests")}
          value="+18%"
          change={{ value: "4%", positive: true }}
        />
        <MetricCard
          title={t("errors")}
          value="2.1%"
          change={{ value: "0.3%", positive: true }}
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
                <OrgCard slug={org.slug} name={org.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
