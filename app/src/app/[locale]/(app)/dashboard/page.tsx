import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import { orgGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../_data/getCurrentUser";
import { OrgCard } from "@/presentation/components/molecules/OrgCard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

const ACTIONS = [
  { key: "actionBilling", href: "/billing", icon: "💳" },
  { key: "actionProfile", href: "/settings", icon: "👤" },
  { key: "actionOrg", href: "/org", icon: "👥" },
  { key: "actionCustomize", href: "#", icon: "🎨" },
] as const;

export default async function DashboardPage() {
  const [t, user] = await Promise.all([
    getTranslations("dashboard"),
    getCurrentUser(),
  ]);
  const orgs = await new ListUserOrgs(orgGateway).execute(user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("welcome", { name: user.fullName || user.email })}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          {t("quickStart")}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map(({ key, href, icon }) => (
            <Link
              key={key}
              href={href}
              className="hover:border-primary-300 rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <span className="text-2xl">{icon}</span>
              <p className="mt-3 text-sm font-semibold text-gray-900">
                {t(`${key}Title`)}
              </p>
              <p className="mt-1 text-sm text-gray-500">{t(`${key}Desc`)}</p>
            </Link>
          ))}
        </div>
      </section>

      {orgs.length > 0 && (
        <section>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <li key={org.id}>
                <OrgCard slug={org.slug} name={org.name} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
