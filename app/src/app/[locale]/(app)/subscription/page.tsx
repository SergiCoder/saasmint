import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "../_data/getCurrentUser";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { PricingSection } from "@/presentation/components/organisms/PricingSection";
import { renderPlanUpgradeCta } from "./_lib/renderPlanUpgradeCta";
import { CurrentSubscriptionCard } from "./_components/CurrentSubscriptionCard";
import { CreditBalanceCard } from "./_components/CreditBalanceCard";
import { FreePlanCard } from "./_components/FreePlanCard";
import { ProductsCheckoutSection } from "./_components/ProductsCheckoutSection";
import { getCreditBalances } from "../_data/getCreditBalances";
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
import {
  findPersonalSubscription,
  findTeamSubscription,
} from "@/domain/models/Subscription";

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

  // Kick off `getCreditBalances` in stage 1 — it doesn't depend on the user
  // object, so chaining it behind `getSubscriptionPageData(user)` would burn
  // an unnecessary RTT on the critical path. `getSubscriptionPageData` still
  // chains off the user fetch because it needs `user.preferredCurrency`.
  const userPromise = getCurrentUser();
  const [t, tPlans, tProducts, user, query, creditBalances, pageData] =
    await Promise.all([
      getTranslations("billing"),
      getTranslations("plans"),
      getTranslations("products"),
      userPromise,
      searchParams,
      getCreditBalances(),
      userPromise.then((u) => getSubscriptionPageData(u)),
    ]);
  const {
    subscriptions,
    plans,
    products,
    userOrgs,
    canManageById,
    teamOwnerName,
    isCurrentUserOrgOwner,
  } = pageData;

  const hasOrg = userOrgs.length > 0;
  const personalSubscription = findPersonalSubscription(subscriptions);
  const teamSubscription = findTeamSubscription(subscriptions);
  const isConcurrent = subscriptions.length > 1;
  // URL ?interval=... wins; otherwise default to whichever active sub has a
  // yearly cadence so the relevant tab is pre-selected on first visit.
  const defaultInterval = subscriptions.some((s) => s.plan.interval === "year")
    ? "year"
    : "month";
  const selectedInterval = parseIntervalParam(query.interval, defaultInterval);
  const teamCanManage =
    teamSubscription !== null && canManageById[teamSubscription.id] === true;
  const personalCanManage =
    personalSubscription !== null &&
    canManageById[personalSubscription.id] === true;

  const { planNames, planDescriptions } = buildPlanTranslations(plans, tPlans);

  // Treat all of the user's subs as "current" — when concurrent, the user's
  // personal AND team plan cards both show the no-CTA "current plan" badge.
  const currentPlans = subscriptions.map((s) => s.plan);

  const groups = buildPlanCardGroups({
    plans,
    currentPlans,
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

      {subscriptions.length === 0 ? (
        <FreePlanCard
          eyebrowLabel={t("currentPlan")}
          planName={tPlans("personal.1.name")}
          description={tPlans("personal.1.description")}
          badgeLabel={tPlans("personal.1.name")}
        />
      ) : (
        <div className="space-y-4">
          {subscriptions.map((s) => {
            // Build "Upgrade to {plan}" CTAs for higher-tier plans in the
            // same context+interval. Reuses renderPlanUpgradeCta so the
            // banner shortcut routes through the same ChangePlan confirm
            // dialog as the plan grid below — single source of truth for
            // the upgrade flow.
            const upgradeTargets = plans.filter(
              (p) =>
                p.context === s.plan.context &&
                p.interval === s.plan.interval &&
                p.tier > s.plan.tier,
            );
            const upgradeCtas = upgradeTargets
              .map((p) => {
                const targetName = translatePlanName(tPlans, p);
                return renderPlanUpgradeCta({
                  plan: p,
                  isUpgrade: true,
                  isCurrent: false,
                  isTeam: s.plan.context === "team",
                  upgradeLabel: t("upgradeTo", { plan: targetName }),
                  changePlanLabel: t("changePlan"),
                  hasOrg,
                  personalSubscription,
                  teamSubscription,
                  personalCanManage,
                  teamCanManage,
                  locale,
                  tBilling: t,
                  tPlans,
                  fullWidth: false,
                });
              })
              .filter((node): node is React.ReactNode => node !== null);
            return (
              <CurrentSubscriptionCard
                key={s.id}
                subscription={s}
                locale={locale}
                planName={translatePlanName(tPlans, s.plan)}
                canManage={canManageById[s.id] === true}
                teamOwnerName={s.plan.context === "team" ? teamOwnerName : null}
                teamOrgSlug={
                  s.plan.context === "team"
                    ? (userOrgs.at(0)?.slug ?? null)
                    : null
                }
                isConcurrent={isConcurrent}
                upgradeCtas={upgradeCtas}
              />
            );
          })}
        </div>
      )}

      {creditBalances.length > 0 && (
        // Trust backend ordering: it returns rows in the order it wants them
        // displayed (org-first for ORG_MEMBER upgraders per rule 16). Plain
        // personal/org labels stay accurate regardless of why both rows
        // appear, so we don't second-guess scope semantics in the client.
        <div className="space-y-4">
          {creditBalances.map((b) => (
            <CreditBalanceCard
              key={b.scope}
              eyebrowLabel={t("creditBalanceLabel")}
              balance={b.balance}
              unitLabel={t("credits")}
              description={t(
                b.scope === "org"
                  ? "creditBalanceOrgDescription"
                  : "creditBalancePersonalDescription",
              )}
              scopeBadge={t(
                b.scope === "org"
                  ? "creditBalanceOrgBadge"
                  : "creditBalancePersonalBadge",
              )}
              locale={locale}
            />
          ))}
        </div>
      )}

      {groups.length === 0 ? (
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

      <ProductsCheckoutSection
        title={t("products")}
        products={products}
        productNames={buildProductTranslations(products, tProducts)}
        creditsLabel={t("credits")}
        buyLabel={t("buy")}
        locale={locale}
        // Picker is only shown for the rule-5b case: an org owner who kept
        // their personal subscription alongside the team plan and therefore
        // has two Stripe customers the credits could land on.
        showPicker={isCurrentUserOrgOwner && isConcurrent}
        pickerLabel={t("productCheckoutContextLabel")}
        personalOptionLabel={t("productCheckoutContextPersonal")}
        teamOptionLabel={t("productCheckoutContextTeam", {
          orgName: userOrgs.at(0)?.name ?? "",
        })}
      />
    </div>
  );
}
