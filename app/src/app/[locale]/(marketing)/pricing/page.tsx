import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ListPlans } from "@/application/use-cases/billing/ListPlans";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import { ListProducts } from "@/application/use-cases/billing/ListProducts";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import {
  planGateway,
  productGateway,
  subscriptionGateway,
  orgGateway,
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
import { PLAN_TIER_PRO } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing");
  return { title: t("pricingTitle") };
}

export default async function PricingPage() {
  const [t, tPlans, tProducts, locale, user] = await Promise.all([
    getTranslations("billing"),
    getTranslations("plans"),
    getTranslations("products"),
    getLocale(),
    getOptionalUser(),
  ]);

  const currency = user?.preferredCurrency;

  const [plans, subscription, products, userOrgs] = await Promise.all([
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
    user
      ? new ListUserOrgs(orgGateway).execute(user.id).catch(() => [])
      : Promise.resolve([]),
  ]);

  const hasOrg = userOrgs.length > 0;
  const currentPlanId = subscription?.plan?.id;

  const planNames: Record<string, string> = {};
  const planDescriptions: Record<string, string> = {};
  for (const plan of plans) {
    const key = `${plan.context}.${plan.tier}`;
    if (!planNames[key]) {
      planNames[key] = tPlans(`${plan.context}.${plan.tier}.name` as never);
      planDescriptions[key] = tPlans(
        `${plan.context}.${plan.tier}.description` as never,
      );
    }
  }

  const groups = buildPlanCardGroups({
    plans,
    currentPlanId,
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
      if (isCurrent) return null;
      if (!isUpgrade) return null;
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
        productNames={Object.fromEntries(
          products.map((p) => [p.credits, tProducts(`${p.credits}` as never)]),
        )}
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
