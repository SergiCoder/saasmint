import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getCurrentUser } from "../_data/getCurrentUser";
import { getOrgMembers } from "../_data/getOrgMembers";
import { getSubscription } from "../_data/getSubscription";
import { getUserOrgs } from "../_data/getUserOrgs";
import { OrgCard } from "@/presentation/components/molecules/OrgCard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

const ACTIONS = [
  { key: "actionBilling", href: "/subscription", icon: "💳" },
  { key: "actionProfile", href: "/profile", icon: "👤" },
  { key: "actionOrg", href: "/org", icon: "👥" },
  { key: "actionCustomize", href: "#", icon: "🎨" },
] as const;

export default async function DashboardPage() {
  // Fetch subscription alongside translations and the user — it has no
  // dependency on user, so there's no reason to wait for user to load first.
  const [t, tOrg, user, subscription] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("org"),
    getCurrentUser(),
    getSubscription(),
  ]);
  const orgs = await getUserOrgs(user.id);

  const totalSpots =
    subscription?.plan.context === "team" ? subscription.quantity : null;

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
