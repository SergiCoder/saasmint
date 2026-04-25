import { getTranslations } from "next-intl/server";
import type { Subscription } from "@/domain/models/Subscription";
import { SubscriptionCard } from "@/presentation/components/organisms/SubscriptionCard";
import { BillingPortalButton } from "./BillingPortalButton";
import { CancelRenewalButton } from "./CancelRenewalButton";
import { ResumeSubscriptionButton } from "./ResumeSubscriptionButton";

interface CurrentSubscriptionCardProps {
  subscription: Subscription;
  locale: string;
  planName: string;
  canManage: boolean;
  teamOwnerName: string | null;
}

/**
 * Server-rendered card summarising the user's active subscription, with
 * Billing-Portal / Cancel-Renewal / Resume actions when the caller is the
 * billing member. The period end is always a real Stripe date — backend
 * v0.7.0 dropped the free-tier placeholder row, so this component only ever
 * renders for users with a real paid subscription.
 */
export async function CurrentSubscriptionCard({
  subscription,
  locale,
  planName,
  canManage,
  teamOwnerName,
}: CurrentSubscriptionCardProps) {
  const t = await getTranslations("billing");

  const periodEndDate = new Date(subscription.currentPeriodEnd);
  const hasRealPeriodEnd = !Number.isNaN(periodEndDate.getTime());

  const plan = subscription.plan;
  const isTeam = plan.context === "team";
  const isCanceling = subscription.canceledAt !== null;

  const intervalLabel =
    plan.interval === "year"
      ? t("billedYearly")
      : plan.interval === "month"
        ? t("billedMonthly")
        : undefined;
  const seatsLabel = isTeam
    ? `${subscription.quantity} ${subscription.quantity === 1 ? t("seat") : t("seats")}`
    : undefined;
  const subtitle = [seatsLabel, intervalLabel].filter(Boolean).join(" · ");

  const periodEndDisplay = hasRealPeriodEnd
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
          confirmBody={t("cancelRenewalBody", { date: periodEndDisplay })}
          confirmAction={t("cancelRenewal")}
          confirmDismiss={t("cancelRenewalKeep")}
        />
      )
    ) : null;

  return (
    <SubscriptionCard
      eyebrowLabel={t("currentPlan")}
      planName={planName}
      status={subscription.status}
      statusLabel={subscription.status}
      subtitle={subtitle || undefined}
      currentPeriodEndIso={
        hasRealPeriodEnd ? periodEndDate.toISOString() : undefined
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
      footer={
        isTeam && !canManage && teamOwnerName
          ? t("managedBy", { name: teamOwnerName })
          : undefined
      }
      actions={
        canManage ? (
          <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
            <BillingPortalButton>{t("portal")}</BillingPortalButton>
            {manageAction}
          </div>
        ) : undefined
      }
    />
  );
}
