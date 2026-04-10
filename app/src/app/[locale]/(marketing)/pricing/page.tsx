import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ListPlans } from "@/application/use-cases/billing/ListPlans";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import { ListProducts } from "@/application/use-cases/billing/ListProducts";
import {
  planGateway,
  productGateway,
  subscriptionGateway,
} from "@/infrastructure/registry";
import { PricingSection } from "@/presentation/components/organisms/PricingSection";
import { ProductsGrid } from "@/presentation/components/organisms/ProductsGrid";
import { GetStartedButton } from "./_components/GetStartedButton";
import { CheckoutButton } from "@/app/[locale]/(app)/subscription/_components/CheckoutButton";
import { TeamCheckoutButton } from "@/app/[locale]/(app)/subscription/_components/TeamCheckoutButton";
import { getOptionalUser } from "../_data/getOptionalUser";
import {
  buildPlanCardGroups,
  splitPlanGroupsByContext,
} from "@/app/[locale]/_lib/buildPlanCards";
import type { Plan } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing");
  return { title: t("pricingTitle") };
}

export default async function PricingPage() {
  const [t, locale, user] = await Promise.all([
    getTranslations("billing"),
    getLocale(),
    getOptionalUser(),
  ]);

  const currency = user?.preferredCurrency;

  const [plans, subscription, products] = await Promise.all([
    new ListPlans(planGateway).execute(currency).catch((err): Plan[] => {
      console.error("Failed to fetch plans", err);
      return [];
    }),
    user
      ? new GetSubscription(subscriptionGateway)
          .execute(currency)
          .catch(() => null)
      : Promise.resolve(null),
    user
      ? new ListProducts(productGateway)
          .execute(currency)
          .catch((): Product[] => [])
      : Promise.resolve([] as Product[]),
  ]);

  const currentPlanId = subscription?.plan.id;

  const groups = buildPlanCardGroups({
    plans,
    currentPlanId,
    locale,
    labels: {
      upgrade: t("upgrade"),
      seat: t("seat"),
    },
    renderCta: ({
      plan,
      isCurrent,
      isUpgrade,
      isTeam,
      displayAmount,
      currency,
      ctaLabel,
    }) => {
      if (!plan.price) return null;
      const highlighted = plan.tier === "pro";
      if (!user) {
        return (
          <GetStartedButton
            planPriceId={plan.price.id}
            highlighted={highlighted}
          >
            {t("select")}
          </GetStartedButton>
        );
      }
      if (isCurrent) return null;
      if (!isUpgrade) return null;
      if (isTeam) {
        return (
          <TeamCheckoutButton
            planPriceId={plan.price.id}
            displayAmount={displayAmount}
            currency={currency}
            locale={locale}
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
          />
        )}
      </div>

      <ProductsGrid
        className="mt-16"
        title={t("products")}
        products={products}
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
