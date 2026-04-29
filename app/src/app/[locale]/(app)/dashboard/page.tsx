import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { findTeamSubscription } from "@/domain/models/Subscription";
import { getCurrentUser } from "../_data/getCurrentUser";
import { getOrgMembers } from "../_data/getOrgMembers";
import { getSubscriptions } from "../_data/getSubscriptions";
import { getUserOrgs } from "../_data/getUserOrgs";
import { OrgCard } from "@/presentation/components/molecules/OrgCard";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("title") };
}

const ACTIONS = [
  { key: "actionBilling", href: "/subscription", icon: "💳" },
  { key: "actionProfile", href: "/profile", icon: "👤" },
  { key: "actionOrg", href: "/org", icon: "👥" },
  { key: "actionCustomize", href: "#", icon: "🎨" },
] as const;

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Independent calls run fully in parallel; only `getSubscriptions` chains
  // off the user fetch so it can pass `user.preferredCurrency` and share
  // the (app) layout's React.cache key for the subscription roundtrip.
  const userPromise = getCurrentUser();
  const [t, tOrg, user, subscriptions, orgs] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("org"),
    userPromise,
    userPromise.then((u) => getSubscriptions(u.preferredCurrency)),
    getUserOrgs(),
  ]);

  const teamSubscription = findTeamSubscription(subscriptions);
  const totalSpots = teamSubscription?.quantity ?? null;

  // Only fetch per-org member counts when we actually render a spotsLabel
  // (team subscriptions). Otherwise we pay for N roundtrips we never display.
  const orgRows =
    totalSpots === null
      ? orgs.map((org) => ({ org, count: 0 }))
      : await Promise.all(
          orgs.map(async (org) => {
            const count = await getOrgMembers(org.id)
              .then((m) => m.length)
              .catch(() => 0);
            return { org, count };
          }),
        );

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
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {tOrg("title")}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgRows.map(({ org, count }) => (
              <li key={org.id}>
                <OrgCard
                  slug={org.slug}
                  name={org.name}
                  spotsLabel={
                    totalSpots !== null
                      ? tOrg("spotsUsed", {
                          used: count,
                          total: totalSpots,
                        })
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
