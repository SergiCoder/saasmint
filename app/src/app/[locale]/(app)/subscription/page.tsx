import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "../_data/getCurrentUser";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { PricingSection } from "@/presentation/components/organisms/PricingSection";
import { ProductsGrid } from "@/presentation/components/organisms/ProductsGrid";
import { CheckoutButton } from "./_components/CheckoutButton";
import { TeamCheckoutButton } from "./_components/TeamCheckoutButton";
import { CurrentSubscriptionCard } from "./_components/CurrentSubscriptionCard";
import { getSubscriptionPageData } from "./_data/getSubscriptionPageData";
import {
  buildPlanCardGroups,
  buildPlanTranslations,
  buildProductTranslations,
  splitPlanGroupsByContext,
} from "@/app/[locale]/_lib/buildPlanCards";
import {
  parseIntervalParam,
  SUBSCRIPTION_INTERVAL_HREFS,
} from "@/app/[locale]/_lib/pricingInterval";
import { translatePlanName } from "@/lib/i18n/planTranslation";
import { PLAN_TIER_PRO } from "@/domain/models/Plan";

interface BillingPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    error?: string;
    interval?: string;
  }>;
}

export async function generateMetadata({
  params,
}: BillingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "billing" });
  return { title: t("title") };
}

export default async function BillingPage({
  params,
  searchParams,
}: BillingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tPlans, tProducts, user, query] = await Promise.all([
    getTranslations("billing"),
    getTranslations("plans"),
    getTranslations("products"),
    getCurrentUser(),
    searchParams,
  ]);

  const {
    subscription,
    plans,
    products,
    userOrgs,
    canManage,
    teamOwnerName,
  } = await getSubscriptionPageData(user);

  const hasOrg = userOrgs.length > 0;
  const currentPlan = subscription?.plan;
  const planName = currentPlan
    ? translatePlanName(tPlans, currentPlan)
    : undefined;
  // URL ?interval=... wins; otherwise default to the user's current plan
  // interval so the relevant tab is pre-selected on first visit.
  const defaultInterval = currentPlan?.interval === "year" ? "year" : "month";
  const selectedInterval = parseIntervalParam(query.interval, defaultInterval);
  const isTeamSubscription = currentPlan?.context === "team";

  const { planNames, planDescriptions } = buildPlanTranslations(plans, tPlans);

  const groups = buildPlanCardGroups({
    plans,
    currentPlanId: currentPlan?.id,
    locale,
    labels: {
      upgrade: t("upgrade"),
      seat: t("seat"),
    },
    planNames,
    planDescriptions,
    renderCta: ({
      plan,
      isCurrent,
      isUpgrade,
      isTeam,
      displayAmount,
      currency,
      ctaLabel,
    }) => {
      if (isCurrent) {
        return (
          <p className="text-center text-sm font-medium text-gray-500">
            {t("currentPlan")}
          </p>
        );
      }
      if (!plan.price) return null;
      if (!isUpgrade) return null;
      const highlighted = plan.tier === PLAN_TIER_PRO;
      if (isTeam) {
        if (hasOrg) return null;
        return (
          <TeamCheckoutButton
            planPriceId={plan.price.id}
            highlighted={highlighted}
          >
            {ctaLabel}
          </TeamCheckoutButton>
        );
      }
      return (
        <CheckoutButton planPriceId={plan.price.id} highlighted={highlighted}>
          {ctaLabel}
        </CheckoutButton>
      );
    },
  });

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
    <div className="mx-auto max-w-5xl space-y-12 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>

      {query.error === "checkout_failed" && (
        <AlertBanner variant="error">{t("checkoutError")}</AlertBanner>
      )}

      {subscription && (
        <CurrentSubscriptionCard
          subscription={subscription}
          locale={locale}
          planName={planName ?? t("currentPlan")}
          canManage={canManage}
          teamOwnerName={teamOwnerName}
        />
      )}

      {isTeamSubscription && !canManage ? (
        <p className="text-sm text-gray-500">{t("teamPlanReadonly")}</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-500">{t("changePlan")}</p>
      ) : (
        <>
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
              {...SUBSCRIPTION_INTERVAL_HREFS}
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
              {...SUBSCRIPTION_INTERVAL_HREFS}
            />
          )}
        </>
      )}

      <ProductsGrid
        title={t("products")}
        products={products}
        productNames={buildProductTranslations(products, tProducts)}
        creditsLabel={t("credits")}
        locale={locale}
        renderCta={(product) =>
          product.price && (
            <CheckoutButton planPriceId={product.price.id}>
              {t("buy")}
            </CheckoutButton>
          )
        }
      />
    </div>
  );
}
