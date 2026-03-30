import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import { ListPlans } from "@/application/use-cases/billing/ListPlans";
import {
  authGateway,
  orgGateway,
  subscriptionGateway,
  planGateway,
} from "@/infrastructure/registry";
import { SubscriptionCard } from "@/presentation/components/organisms/SubscriptionCard";
import {
  PricingTable,
  type PricingTableProps,
} from "@/presentation/components/organisms/PricingTable";
import { CheckoutButton } from "./_components/CheckoutButton";
import { BillingPortalButton } from "./_components/BillingPortalButton";

export const metadata: Metadata = {
  title: "Billing",
};

export default async function BillingPage() {
  const [t, user] = await Promise.all([
    getTranslations("billing"),
    new GetCurrentUser(authGateway).execute(),
  ]);
  const orgs = await new ListUserOrgs(orgGateway).execute(user.id);
  const orgId = orgs[0]?.id;

  const subscription = orgId
    ? await new GetSubscription(subscriptionGateway).execute(orgId)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>

      {subscription ? (
        <SubscriptionCard
          planName={subscription.plan.name}
          status={subscription.status}
          statusLabel={subscription.status}
          interval={subscription.plan.interval}
          price={`$${subscription.quantity}`}
          currentPeriodEnd={new Date(
            subscription.currentPeriodEnd,
          ).toLocaleDateString()}
          periodEndLabel={t("currentPlan")}
          cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
          cancelLabel={subscription.cancelAtPeriodEnd ? t("cancel") : undefined}
          actions={
            <BillingPortalButton orgId={orgId}>
              {t("portal")}
            </BillingPortalButton>
          }
        />
      ) : (
        <NoSubscription orgId={orgId} t={t} />
      )}
    </div>
  );
}

async function NoSubscription({
  orgId,
  t,
}: {
  orgId?: string;
  t: Awaited<ReturnType<typeof getTranslations<"billing">>>;
}) {
  let plans: PricingTableProps["plans"] = [];
  try {
    const fetched = await new ListPlans(planGateway).execute();
    plans = fetched.map((plan) => {
      const highlighted = plan.name.toLowerCase().includes("pro");
      return {
        name: plan.name,
        price: plan.prices[0]
          ? `$${(plan.prices[0].amount / 100).toFixed(0)}`
          : "$0",
        interval: plan.interval,
        features: [] as string[],
        highlighted,
        cta: plan.prices[0] ? (
          <CheckoutButton
            planPriceId={plan.prices[0].stripePriceId}
            orgId={orgId}
            highlighted={highlighted}
          >
            {t("upgrade")}
          </CheckoutButton>
        ) : (
          <span />
        ),
      };
    });
  } catch (err) {
    console.error("Failed to fetch plans", err);
    plans = [];
  }

  if (plans.length === 0) {
    return <p className="text-sm text-gray-500">{t("changePlan")}</p>;
  }

  return <PricingTable plans={plans} />;
}
