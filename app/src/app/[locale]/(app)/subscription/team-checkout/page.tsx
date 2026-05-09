import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { findPersonalSubscription } from "@/domain/models/Subscription";
import { translatePlanName } from "@/lib/i18n/planTranslation";
import { formatLongDate } from "@/lib/formatLongDate";
import { getCurrentUser } from "../../_data/getCurrentUser";
import { getPlans } from "../../_data/getPlans";
import { getSubscriptions } from "../../_data/getSubscriptions";
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

  // Resolve the user first so subsequent fetches can share its
  // preferredCurrency. getCurrentUser is React-cached and is already in
  // flight from the (app) layout, so this isn't an extra roundtrip.
  const [t, tPlans, user, { plan: planPriceId }] = await Promise.all([
    getTranslations("billing"),
    getTranslations("plans"),
    getCurrentUser(),
    searchParams,
  ]);

  if (!planPriceId) {
    redirect(`/${locale}/subscription`);
  }

  const currency = user.preferredCurrency;
  // getSubscriptions(currency) shares the (app) layout's React.cache key,
  // so layout + this page render off a single subscription roundtrip.
  const [subscriptions, plans] = await Promise.all([
    getSubscriptions(currency),
    getPlans(currency),
  ]);
  const plan = plans.find((p) => p.price?.id === planPriceId);

  if (!plan || !plan.price || plan.context !== "team") {
    redirect(`/${locale}/subscription`);
  }

  // Show the auto-cancel notice + opt-out checkbox only when the user has a
  // currently-active personal subscription that isn't already scheduled to
  // cancel. Anything else (no sub, only-team-sub, already-canceling) skips
  // the UI.
  const personalSubscription = findPersonalSubscription(subscriptions);
  const showPersonalSubNotice =
    personalSubscription !== null &&
    personalSubscription.status === "active" &&
    personalSubscription.cancelAt === null;

  const personalSubEndDate = showPersonalSubNotice
    ? new Date(personalSubscription.currentPeriodEnd)
    : null;
  const personalSubEndDateDisplay = personalSubEndDate
    ? formatLongDate(personalSubEndDate, locale) || undefined
    : undefined;

  return (
    <div className="mx-auto max-w-md space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">{t("teamCheckout")}</h1>
      <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <TeamCheckoutForm
          planPriceId={plan.price.id}
          planName={translatePlanName(tPlans, plan)}
          displayAmount={plan.price.displayAmount}
          currency={plan.price.currency}
          locale={locale}
          interval={plan.interval}
          personalSubAutoCancelNotice={
            personalSubEndDateDisplay
              ? t("personalSubAutoCancelNotice", {
                  date: personalSubEndDateDisplay,
                })
              : undefined
          }
          labels={{
            orgName: t("orgName"),
            seat: t("seat"),
            seats: t("seats"),
            total: t("total"),
            checkout: t("upgrade"),
            error: t("checkoutError"),
            keepPersonalSubscription: t("keepPersonalSubscription"),
          }}
        />
      </div>
    </div>
  );
}
