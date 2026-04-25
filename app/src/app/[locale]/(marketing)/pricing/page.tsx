import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
import { startCheckout, startProductCheckout } from "@/app/actions/billing";
import { getOptionalUser } from "../_data/getOptionalUser";
import {
  buildPlanCardGroups,
  buildPlanTranslations,
  buildProductTranslations,
  splitPlanGroupsByContext,
} from "@/app/[locale]/_lib/buildPlanCards";
import {
  parseIntervalParam,
  PRICING_INTERVAL_HREFS,
} from "@/app/[locale]/_lib/pricingInterval";
import type { Plan } from "@/domain/models/Plan";
import { PLAN_TIER_PRO } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";

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

  const [plans, subscription, products, userOrgs] = await Promise.all([
    planGateway.listPlans(currency).catch((err: unknown): Plan[] => {
      console.error("Failed to fetch plans", err);
      return [];
    }),
    user
      ? subscriptionGateway.getSubscription(currency).catch(() => null)
      : Promise.resolve(null),
    user
      ? productGateway.listProducts(currency).catch((): Product[] => [])
      : Promise.resolve([] as Product[]),
    user ? orgGateway.listUserOrgs().catch(() => []) : Promise.resolve([]),
  ]);

  const hasOrg = userOrgs.length > 0;
  const currentPlanId = subscription?.plan?.id;

  const { planNames, planDescriptions } = buildPlanTranslations(plans, tPlans);

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
        <CheckoutButton
          action={startCheckout}
          field={{ name: "planPriceId", value: plan.price.id }}
          highlighted={highlighted}
        >
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

      <ProductsGrid
        className="mt-16"
        title={t("products")}
        products={products}
        productNames={buildProductTranslations(products, tProducts)}
        creditsLabel={t("credits")}
        locale={locale}
        renderCta={(product) =>
          product.price && (
            <CheckoutButton
              action={startProductCheckout}
              field={{ name: "productPriceId", value: product.price.id }}
            >
              {t("buy")}
            </CheckoutButton>
          )
        }
      />
    </div>
  );
}
