import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListPlans } from "@/application/use-cases/billing/ListPlans";
import { planGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../../_data/getCurrentUser";
import { TeamCheckoutForm } from "./_components/TeamCheckoutForm";

interface TeamCheckoutPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}

export default async function TeamCheckoutPage({
  params,
  searchParams,
}: TeamCheckoutPageProps) {
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

  const currency = user.preferredCurrency;
  const plans = await new ListPlans(planGateway).execute(currency);
  const plan = plans.find((p) => p.price?.id === planPriceId);

  if (!plan || !plan.price || plan.context !== "team") {
    redirect("/subscription");
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">{t("teamCheckout")}</h1>
      <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <TeamCheckoutForm
          planPriceId={plan.price.id}
          planName={tPlans(`${plan.context}.${plan.tier}.name` as never)}
          displayAmount={plan.price.displayAmount}
          currency={plan.price.currency}
          locale={locale}
          interval={plan.interval}
          labels={{
            orgName: t("orgName"),
            seat: t("seat"),
            seats: t("seats"),
            total: t("total"),
            checkout: t("upgrade"),
            error: t("checkoutError"),
          }}
        />
      </div>
    </div>
  );
}
