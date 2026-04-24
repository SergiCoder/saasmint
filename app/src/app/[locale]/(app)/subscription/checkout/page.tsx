import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { planGateway } from "@/infrastructure/registry";
import { PLAN_TIER_FREE } from "@/domain/models/Plan";
import { formatCurrency } from "@/lib/formatCurrency";
import { translatePlanName } from "@/lib/i18n/planTranslation";
import { getCurrentUser } from "../../_data/getCurrentUser";
import { CheckoutButton } from "../_components/CheckoutButton";
import { startCheckout } from "@/app/actions/billing";

interface CheckoutPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tPlans, user, { plan: planPriceId }] = await Promise.all([
    getTranslations("billing"),
    getTranslations("plans"),
    getCurrentUser(),
    searchParams,
  ]);

  if (!planPriceId) {
    redirect("/subscription");
  }

  const plans = await planGateway.listPlans(user.preferredCurrency);
  const plan = plans.find((p) => p.price?.id === planPriceId);

  if (
    !plan ||
    !plan.price ||
    plan.context !== "personal" ||
    plan.tier === PLAN_TIER_FREE
  ) {
    redirect("/subscription");
  }

  const intervalLabel =
    plan.interval === "year" ? t("billedYearly") : t("billedMonthly");

  return (
    <div className="mx-auto max-w-md space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">{t("checkout")}</h1>
      <div className="space-y-4 rounded-xl border border-gray-200 p-6 shadow-sm">
        <div>
          <p className="text-lg font-semibold text-gray-900">
            {translatePlanName(tPlans, plan)}
          </p>
          <p className="text-sm text-gray-600">
            {formatCurrency(
              plan.price.displayAmount,
              plan.price.currency,
              locale,
            )}{" "}
            · {intervalLabel}
          </p>
        </div>
        <CheckoutButton
          action={startCheckout}
          field={{ name: "planPriceId", value: plan.price.id }}
          highlighted
        >
          {t("upgrade")}
        </CheckoutButton>
      </div>
    </div>
  );
}
