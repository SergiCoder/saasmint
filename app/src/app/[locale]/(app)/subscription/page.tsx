import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import { ListPlans } from "@/application/use-cases/billing/ListPlans";
import { ListProducts } from "@/application/use-cases/billing/ListProducts";
import {
  subscriptionGateway,
  planGateway,
  productGateway,
} from "@/infrastructure/registry";
import { getCurrentUser } from "../_data/getCurrentUser";
import { SubscriptionCard } from "@/presentation/components/organisms/SubscriptionCard";
import { PricingSection } from "@/presentation/components/organisms/PricingSection";
import { ProductsGrid } from "@/presentation/components/organisms/ProductsGrid";
import { CheckoutButton } from "./_components/CheckoutButton";
import { TeamCheckoutButton } from "./_components/TeamCheckoutButton";
import { BillingPortalButton } from "./_components/BillingPortalButton";
import { CancelRenewalButton } from "./_components/CancelRenewalButton";
import { ResumeSubscriptionButton } from "./_components/ResumeSubscriptionButton";
import { canManageBilling } from "./_data/canManageBilling";
import {
  buildPlanCardGroups,
  splitPlanGroupsByContext,
} from "@/app/[locale]/_lib/buildPlanCards";
import type { Plan } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing");
  return { title: t("title") };
}

export default async function BillingPage() {
  const plansPromise = new ListPlans(planGateway)
    .execute()
    .catch((err): Plan[] => {
      console.error("Failed to fetch plans", err);
      return [];
    });
  const productsPromise = new ListProducts(productGateway)
    .execute()
    .catch((err): Product[] => {
      console.error("Failed to fetch products", err);
      return [];
    });

  const [t, locale, user, subscription, plans, products] = await Promise.all([
    getTranslations("billing"),
    getLocale(),
    getCurrentUser(),
    new GetSubscription(subscriptionGateway).execute(),
    plansPromise,
    productsPromise,
  ]);

  const canManage = subscription
    ? await canManageBilling(user, subscription)
    : false;

  const currentPlan = subscription?.plan;
  const planName = currentPlan?.name;
  const initialInterval: "month" | "year" =
    currentPlan?.interval === "year" ? "year" : "month";
  const isTeamSubscription = currentPlan?.context === "team";

  // Detect placeholder period-end dates returned by the backend for users
  // without a real Stripe subscription (e.g. free tier). Anything more than
  // a few decades out is treated as "no real renewal date".
  const periodEndDate = subscription
    ? new Date(subscription.currentPeriodEnd)
    : null;
  const hasRealPeriodEnd =
    periodEndDate !== null &&
    !Number.isNaN(periodEndDate.getTime()) &&
    periodEndDate.getUTCFullYear() < 9000;

  const groups = buildPlanCardGroups({
    plans,
    currentPlanId: currentPlan?.id,
    labels: {
      upgrade: t("upgrade"),
      seat: t("seat"),
    },
    renderCta: ({
      plan,
      isCurrent,
      isUpgrade,
      isTeam,
      unitPrice,
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
      const highlighted = plan.tier === "pro";
      if (isTeam) {
        return (
          <TeamCheckoutButton
            planPriceId={plan.price.id}
            unitPrice={unitPrice}
            interval={plan.interval}
            highlighted={highlighted}
            seatLabel={t("seat")}
            seatsLabel={t("seats")}
            totalLabel={t("total")}
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

      {subscription &&
        (() => {
          const intervalLabel =
            currentPlan?.interval === "year"
              ? t("billedYearly")
              : currentPlan?.interval === "month"
                ? t("billedMonthly")
                : undefined;
          const seatsLabel = isTeamSubscription
            ? `${subscription.quantity} ${subscription.quantity === 1 ? t("seat") : t("seats")}`
            : undefined;
          const subtitle = [seatsLabel, intervalLabel]
            .filter(Boolean)
            .join(" · ");
          const isCanceling = subscription.canceledAt !== null;

          const periodEndDisplay =
            hasRealPeriodEnd && periodEndDate
              ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
                  periodEndDate,
                )
              : "";

          const manageAction =
            canManage && hasRealPeriodEnd ? (
              isCanceling ? (
                <ResumeSubscriptionButton>
                  {t("resumeSubscription")}
                </ResumeSubscriptionButton>
              ) : (
                <CancelRenewalButton
                  label={t("cancelRenewal")}
                  confirmTitle={t("cancelRenewalTitle")}
                  confirmBody={t("cancelRenewalBody", {
                    date: periodEndDisplay,
                  })}
                  confirmAction={t("cancelRenewal")}
                  confirmDismiss={t("cancelRenewalKeep")}
                />
              )
            ) : null;

          return (
            <SubscriptionCard
              eyebrowLabel={t("currentPlan")}
              planName={planName ?? t("currentPlan")}
              status={subscription.status}
              statusLabel={subscription.status}
              subtitle={subtitle || undefined}
              currentPeriodEndIso={
                hasRealPeriodEnd && periodEndDate
                  ? periodEndDate.toISOString()
                  : undefined
              }
              periodEndLocale={locale}
              periodEndLabel={
                hasRealPeriodEnd
                  ? isCanceling
                    ? t("endsOn")
                    : t("renewsOn")
                  : undefined
              }
              cancelAtPeriodEnd={isCanceling}
              cancelLabel={isCanceling ? t("cancel") : undefined}
              actions={
                <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
                  <BillingPortalButton>{t("portal")}</BillingPortalButton>
                  {manageAction}
                </div>
              }
            />
          );
        })()}

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
              defaultInterval={initialInterval}
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
              defaultInterval={initialInterval}
            />
          )}
        </>
      )}

      <ProductsGrid
        title={t("products")}
        products={products}
        creditsLabel={t("credits")}
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
