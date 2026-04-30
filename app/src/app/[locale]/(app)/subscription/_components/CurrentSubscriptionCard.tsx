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
  /**
   * Set to `true` when the user has both a personal and a team subscription
   * (rule 5 concurrent billing). Drives explicit `?context=` plumbing on
   * cancel/resume so the right sub is targeted, and lets the eyebrow label
   * disambiguate the cards visually. Single-sub callers can omit it.
   */
  isConcurrent?: boolean;
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
  isConcurrent = false,
}: CurrentSubscriptionCardProps) {
  const t = await getTranslations("billing");

  const plan = subscription.plan;
  const isTeam = plan.context === "team";
  // Three terminal states for the date row:
  //  - status=canceled: sub fully ended; show `canceledAt` with "Ends on".
  //  - cancelAt set on an active sub: scheduled to cancel; show `cancelAt`
  //    with "Cancels on" and offer Resume.
  //  - else: active and renewing; show `currentPeriodEnd` with "Renews on"
  //    and offer Cancel-renewal.
  // `current_period_end` is no longer used for cancel-date display since the
  // backend now mirrors Stripe's `cancel_at` directly (Dahlia-era field).
  const isFullyCanceled = subscription.status === "canceled";
  const isScheduledToCancel =
    !isFullyCanceled && subscription.cancelAt !== null;
  const dateIso = isFullyCanceled
    ? subscription.canceledAt
    : isScheduledToCancel
      ? subscription.cancelAt
      : subscription.currentPeriodEnd;
  const dateLabel = isFullyCanceled
    ? t("endsOn")
    : isScheduledToCancel
      ? t("cancelsOn")
      : t("renewsOn");

  const dateValue = dateIso ? new Date(dateIso) : null;
  const hasValidDate = dateValue !== null && !Number.isNaN(dateValue.getTime());
  // Pin the context query param when the user has both subs running so the
  // backend doesn't fall back to its default ("team" for ORG_MEMBER).
  const buttonContext = isConcurrent
    ? isTeam
      ? "team"
      : "personal"
    : undefined;

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

  // The cancel-confirm dialog quotes the period end (when the cancel will
  // take effect for a live cancel-renewal click), not `cancel_at` — which
  // is unset until the user clicks the very button the dialog gates.
  const periodEndDate = new Date(subscription.currentPeriodEnd);
  const periodEndDisplay = !Number.isNaN(periodEndDate.getTime())
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
        periodEndDate,
      )
    : "";

  const manageAction = canManage ? (
    isScheduledToCancel || isFullyCanceled ? (
      // Resume only makes sense while the sub is still active (Stripe rejects
      // resume on a fully-canceled sub); the button is hidden post-cancel
      // and the user must start a new checkout instead.
      isScheduledToCancel ? (
        <ResumeSubscriptionButton context={buttonContext}>
          {t("resumeSubscription")}
        </ResumeSubscriptionButton>
      ) : null
    ) : isTeam ? (
      <CancelRenewalButton
        label={t("cancelRenewal")}
        confirmTitle={t("cancelRenewalTeamTitle")}
        confirmBody={t("cancelRenewalTeamBody", { date: periodEndDisplay })}
        confirmAction={t("cancelRenewalTeam")}
        confirmDismiss={t("cancelRenewalKeep")}
        context={buttonContext}
      />
    ) : (
      <CancelRenewalButton
        label={t("cancelRenewal")}
        confirmTitle={t("cancelRenewalTitle")}
        confirmBody={t("cancelRenewalBody", { date: periodEndDisplay })}
        confirmAction={t("cancelRenewal")}
        confirmDismiss={t("cancelRenewalKeep")}
        context={buttonContext}
      />
    )
  ) : null;

  // Disambiguate the card eyebrow when the user has both subs side-by-side.
  const eyebrowLabel = isConcurrent
    ? isTeam
      ? t("currentTeamPlan")
      : t("currentPersonalPlan")
    : t("currentPlan");

  return (
    <SubscriptionCard
      eyebrowLabel={eyebrowLabel}
      planName={planName}
      status={subscription.status}
      statusLabel={subscription.status}
      subtitle={subtitle || undefined}
      currentPeriodEndIso={hasValidDate ? dateValue.toISOString() : undefined}
      periodEndLocale={locale}
      periodEndLabel={hasValidDate ? dateLabel : undefined}
      cancelAtPeriodEnd={isScheduledToCancel}
      cancelLabel={isScheduledToCancel ? t("cancel") : undefined}
      footer={
        isTeam && !canManage && teamOwnerName
          ? t("managedBy", { name: teamOwnerName })
          : undefined
      }
      actions={
        canManage && manageAction ? (
          <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
            <BillingPortalButton>{t("portal")}</BillingPortalButton>
            {manageAction}
          </div>
        ) : undefined
      }
    />
  );
}
