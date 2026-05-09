import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PricingSection } from "@/presentation/components/organisms/PricingSection";
import { GetStartedButton } from "./_components/GetStartedButton";
import { ProductsCheckoutSection } from "@/app/[locale]/(app)/subscription/_components/ProductsCheckoutSection";
import { renderPlanUpgradeCta } from "@/app/[locale]/(app)/subscription/_lib/renderPlanUpgradeCta";
import { getOrgMembers } from "@/app/[locale]/(app)/_data/getOrgMembers";
import { getPlans } from "@/app/[locale]/(app)/_data/getPlans";
import { getProducts } from "@/app/[locale]/(app)/_data/getProducts";
import { getSubscriptions } from "@/app/[locale]/(app)/_data/getSubscriptions";
import { getUserOrgs } from "@/app/[locale]/(app)/_data/getUserOrgs";
import { canManageBilling } from "@/app/[locale]/(app)/subscription/_data/canManageBilling";
import { getOptionalUser } from "../_data/getOptionalUser";
import {
  buildPlanCardGroups,
  buildPlanTranslations,
  buildProductPriceSubLabels,
  buildProductTranslations,
  makeLocalSubLabelFormatter,
  splitPlanGroupsByContext,
} from "@/app/[locale]/_lib/buildPlanCards";
import {
  parseIntervalParam,
  PRICING_INTERVAL_HREFS,
} from "@/app/[locale]/_lib/pricingInterval";
import type { Plan } from "@/domain/models/Plan";
import { PLAN_TIER_FREE, PLAN_TIER_PRO } from "@/domain/models/Plan";
import {
  findPersonalSubscription,
  findTeamSubscription,
} from "@/domain/models/Subscription";

/**
 * Backend v0.7.0 stopped exposing the personal-free plan row (free = absence
 * of a Subscription). To keep the entry-tier card visible alongside paid
 * tiers on the marketing pricing page, we synthesize personal-free entries
 * for both billing intervals so the Free card appears in both monthly and
 * yearly tabs.
 */
const SYNTHETIC_FREE_PLANS: Plan[] = (["month", "year"] as const).map<Plan>(
  (interval) => ({
    id: `synthetic:free:personal:${interval}`,
    name: "Free",
    description: "",
    context: "personal",
    tier: PLAN_TIER_FREE,
    interval,
    price: null,
  }),
);

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ interval?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "billing" });
  return { title: t("pricingTitle") };
}

export default async function PricingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tPlans, tProducts, user, query] = await Promise.all([
    getTranslations("billing"),
    getTranslations("plans"),
    getTranslations("products"),
    getOptionalUser(),
    searchParams,
  ]);

  const selectedInterval = parseIntervalParam(query.interval);

  const currency = user?.preferredCurrency;

  const [plans, subscriptions, products, userOrgs] = await Promise.all([
    getPlans(currency),
    user ? getSubscriptions(currency) : Promise.resolve([]),
    user ? getProducts(currency) : Promise.resolve([]),
    user ? getUserOrgs() : Promise.resolve([]),
  ]);

  const hasOrg = userOrgs.length > 0;
  const isConcurrent = subscriptions.length > 1;
  const currentPlans = subscriptions.map((s) => s.plan);

  const personalSubscription = findPersonalSubscription(subscriptions);
  const teamSubscription = findTeamSubscription(subscriptions);

  // Per-context billing-management flags drive whether the upgrade CTA on a
  // higher-tier card routes to the Stripe Customer Portal (the canonical
  // change-plan surface) or stays hidden (non-billing org members can't
  // action a team upgrade). Personal subs are always manageable by their
  // owner; team subs only by the org's billing member.
  // canManageBilling() shares React.cache with /subscription, so resolving
  // both contexts here is free when the user only happens to land on
  // /pricing first. Both calls run concurrently; either side resolves to
  // false when the user has no sub in that context (cheap default).
  const [personalCanManage, teamCanManage] = await Promise.all([
    user && personalSubscription
      ? canManageBilling(user.id, personalSubscription)
      : Promise.resolve(false),
    user && teamSubscription
      ? canManageBilling(user.id, teamSubscription)
      : Promise.resolve(false),
  ]);

  // Resolve org-owner flag only when both signals that gate the picker are
  // already true (signed-in user with concurrent personal+team subs). Skips
  // the orgMembers roundtrip in every other case — most page renders.
  const firstOrg = userOrgs.at(0);
  const isCurrentUserOrgOwner =
    user && isConcurrent && firstOrg
      ? (await getOrgMembers(firstOrg.id)).some(
          (m) => m.user.id === user.id && m.role === "owner",
        )
      : false;

  const allPlans = [...SYNTHETIC_FREE_PLANS, ...plans];
  const { planNames, planDescriptions } = buildPlanTranslations(
    allPlans,
    tPlans,
  );

  const groups = buildPlanCardGroups({
    plans: allPlans,
    currentPlans,
    locale,
    fallbackCurrency: plans.find((p) => p.price)?.price?.currency ?? currency,
    labels: {
      upgrade: t("upgrade"),
      seat: t("seat"),
      billedYearly: t("billedYearly"),
    },
    planNames,
    planDescriptions,
    formatPriceSubLabelLocal: makeLocalSubLabelFormatter(t),
    renderCta: ({
      plan,
      isCurrent,
      isUpgrade,
      isTeam,
      displayAmount,
      currency,
      ctaLabel,
    }) => {
      // Synthetic personal-Free card flags as current for any signed-in
      // user with no paid personal sub — the synthetic plan ID never
      // matches `currentPlanIds`, but the user is functionally on Free.
      const isFreeCurrent =
        plan.tier === PLAN_TIER_FREE &&
        plan.context === "personal" &&
        user !== null &&
        personalSubscription === null;
      if (isCurrent || isFreeCurrent) {
        return (
          <p className="text-center text-sm font-medium text-gray-500">
            {t("currentPlan")}
          </p>
        );
      }
      if (plan.tier === PLAN_TIER_FREE) {
        // Free is the entry tier: signed-out visitors get a "select" CTA to
        // /signup; signed-in users would be downgrading and per the marketing
        // pricing convention we suppress downgrade CTAs entirely.
        if (user) return null;
        return <GetStartedButton>{t("select")}</GetStartedButton>;
      }
      if (!plan.price) return null;
      const highlighted = plan.tier === PLAN_TIER_PRO;
      if (!user) {
        return (
          <GetStartedButton
            planPriceId={plan.price.id}
            highlighted={highlighted}
            context={isTeam ? "team" : undefined}
          >
            {t("select")}
          </GetStartedButton>
        );
      }
      return renderPlanUpgradeCta({
        plan,
        isUpgrade,
        isCurrent,
        isTeam,
        upgradeLabel: ctaLabel,
        changePlanLabel: t("changePlan"),
        hasOrg,
        personalSubscription,
        teamSubscription,
        personalCanManage,
        teamCanManage,
        locale,
        tBilling: t,
        tPlans,
      });
    },
  });

  if (groups.length === 0) {
    return null;
  }

  const {
    personal: personalGroups,
    team: teamGroups,
    personalSavingsPct,
    teamSavingsPct,
  } = splitPlanGroupsByContext(groups);

  const sectionLabels = {
    monthly: t("monthly"),
    yearly: t("yearly"),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t("pricingTitle")}
        </h1>
      </div>

      <div className="mt-12 space-y-16">
        {personalGroups.length > 0 && (
          <PricingSection
            title={t("personalPlans")}
            description={t("personalPlansDesc")}
            groups={personalGroups}
            labels={sectionLabels}
            savingsBadge={
              personalSavingsPct > 0
                ? t("savingsBadge", { pct: personalSavingsPct })
                : undefined
            }
            selectedInterval={selectedInterval}
            {...PRICING_INTERVAL_HREFS}
          />
        )}
        {teamGroups.length > 0 && (
          <PricingSection
            title={t("teamPlans")}
            description={t("teamPlansDesc")}
            groups={teamGroups}
            labels={sectionLabels}
            savingsBadge={
              teamSavingsPct > 0
                ? t("savingsBadge", { pct: teamSavingsPct })
                : undefined
            }
            selectedInterval={selectedInterval}
            {...PRICING_INTERVAL_HREFS}
          />
        )}
      </div>

      <div className="mt-16">
        <ProductsCheckoutSection
          title={t("products")}
          products={products}
          productNames={buildProductTranslations(products, tProducts)}
          priceSubLabels={buildProductPriceSubLabels(
            products,
            locale,
            ({ localAmount, billedCurrency }) =>
              t("billedInLocalMonthly", {
                amount: localAmount,
                currency: billedCurrency,
              }),
          )}
          creditsLabel={t("credits")}
          buyLabel={t("buy")}
          locale={locale}
          // Picker is only shown for the rule-5b case: an org owner who kept
          // their personal subscription alongside the team plan and therefore
          // has two Stripe customers the credits could land on. Mirrors the
          // gate on /subscription so both surfaces behave identically.
          showPicker={isCurrentUserOrgOwner && isConcurrent}
          pickerLabel={t("productCheckoutContextLabel")}
          personalOptionLabel={t("productCheckoutContextPersonal")}
          teamOptionLabel={t("productCheckoutContextTeam", {
            orgName: userOrgs.at(0)?.name ?? "",
          })}
        />
      </div>
    </div>
  );
}
