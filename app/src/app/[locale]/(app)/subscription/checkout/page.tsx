import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { formatCurrency } from "@/lib/formatCurrency";
import { translatePlanName } from "@/lib/i18n/planTranslation";
import { getCurrentUser } from "../../../_data/getCurrentUser";
import { getPlans } from "../../../_data/getPlans";
import { CheckoutButton } from "../_components/CheckoutButton";
import { startCheckout } from "@/app/actions/billing";

interface CheckoutPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}

export async function generateMetadata({
  params,
}: CheckoutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "billing" });
  return { title: t("checkout") };
}

export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Kick off `getPlans` from the user fetch so the plan catalog round-trip
  // overlaps the translation loads instead of running serially after them.
  // We still await the user to honour the redirect-on-failure inside
  // `getCurrentUser`, but the resolved value is only consumed via `plansPromise`.
  const userPromise = getCurrentUser();
  const plansPromise = userPromise.then((u) => getPlans(u.preferredCurrency));
  const [t, tPlans, , { plan: planPriceId }, plans] = await Promise.all([
    getTranslations("billing"),
    getTranslations("plans"),
    userPromise,
    searchParams,
    plansPromise,
  ]);

  if (!planPriceId) {
    redirect(`/${locale}/subscription`);
  }

  const plan = plans.find((p) => p.price?.id === planPriceId);

  if (!plan || !plan.price || plan.context !== "personal") {
    redirect(`/${locale}/subscription`);
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
