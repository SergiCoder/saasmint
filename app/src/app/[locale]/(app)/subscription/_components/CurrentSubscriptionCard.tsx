import { getTranslations } from "next-intl/server";
import type { Subscription } from "@/domain/models/Subscription";
import { Link } from "@/lib/i18n/navigation";
import { translatePlanName } from "@/lib/i18n/planTranslation";
import { formatLongDate } from "@/lib/formatLongDate";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { SubscriptionCard } from "@/presentation/components/organisms/SubscriptionCard";
import {
  releaseScheduledChange,
  resumeSubscription,
} from "@/app/actions/billing";
import { BillingPortalButton } from "./BillingPortalButton";
import { BillingActionButton } from "./BillingActionButton";
import { CancelRenewalButton } from "./CancelRenewalButton";

interface CurrentSubscriptionCardProps {
  subscription: Subscription;
  locale: string;
  planName: string;
  canManage: boolean;
  teamOwnerName: string | null;
  /**
   * Slug of the team subscription's org. When set on a team card, the seats
   * row deep-links to `/org/{slug}` so the billing member can jump straight
   * to the seat-management page. Ignored on personal cards.
   */
  teamOrgSlug?: string | null;
  /**
   * Set to `true` when the user has both a personal and a team subscription
   * (rule 5 concurrent billing). Drives explicit `?context=` plumbing on
   * cancel/resume so the right sub is targeted. Single-sub callers can omit it.
   */
  isConcurrent?: boolean;
  /**
   * Upgrade CTAs for higher-tier plans in this subscription's context.
   * Rendered in the active-renewing banner alongside Cancel renewal so
   * upgrade paths are reachable without scrolling to the plan grid.
   * Empty/omitted on Pro (no higher tier) or for non-billing members.
   */
  upgradeCtas?: React.ReactNode[];
}

/**
 * Server-rendered card summarising the user's active subscription. Layout
 * collapses management actions to two zones: a "Manage billing" button in
 * the top-right (next to the status badge), and an inline "Cancel renewal"
 * link on the date row. Scheduled-cancel and scheduled-downgrade promote to
 * full-width banners that own their respective primary action ("Resume" /
 * "Keep current plan") plus the cancel-renewal action when relevant.
 */
export async function CurrentSubscriptionCard({
  subscription,
  locale,
  planName,
  canManage,
  teamOwnerName,
  teamOrgSlug,
  isConcurrent = false,
  upgradeCtas = [],
}: CurrentSubscriptionCardProps) {
  const [t, tPlans] = await Promise.all([
    getTranslations("billing"),
    getTranslations("plans"),
  ]);

  const plan = subscription.plan;
  const isTeam = plan.context === "team";
  const isFullyCanceled = subscription.status === "canceled";
  const isScheduledToCancel =
    !isFullyCanceled && subscription.cancelAt !== null;
  // Downgrade scheduled at period end. The cancel banner takes precedence —
  // when the user has BOTH a cancel and a downgrade pending, Stripe releases
  // the schedule on cancel; the downgrade message would just be misleading.
  const scheduledPlan = subscription.scheduledPlan;
  const isScheduledDowngrade =
    !isFullyCanceled &&
    !isScheduledToCancel &&
    scheduledPlan !== null &&
    subscription.scheduledChangeAt !== null;
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
  const seatsText = isTeam
    ? t("seatsOfMax", {
        count: subscription.seatsUsed,
        max: subscription.seatLimit,
      })
    : null;
  const seatsNode =
    seatsText && teamOrgSlug ? (
      <Link
        href={`/org/${teamOrgSlug}`}
        className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
      >
        {seatsText}
      </Link>
    ) : seatsText ? (
      <span>{seatsText}</span>
    ) : null;
  const subtitle =
    seatsNode || intervalLabel ? (
      <>
        {seatsNode}
        {seatsNode && intervalLabel ? <span> · </span> : null}
        {intervalLabel ? <span>{intervalLabel}</span> : null}
      </>
    ) : null;

  // The cancel-confirm dialog quotes the period end (when the cancel will
  // take effect for a live cancel-renewal click), not `cancel_at` — which
  // is unset until the user clicks the very button the dialog gates.
  const periodEndDate = new Date(subscription.currentPeriodEnd);
  const periodEndDisplay = formatLongDate(periodEndDate, locale);

  const cancelRenewalAction =
    canManage && !isScheduledToCancel && !isFullyCanceled ? (
      <CancelRenewalButton
        label={t("cancelRenewal")}
        confirmTitle={
          isTeam ? t("cancelRenewalTeamTitle") : t("cancelRenewalTitle")
        }
        confirmBody={
          isTeam
            ? t("cancelRenewalTeamBody", { date: periodEndDisplay })
            : t("cancelRenewalBody", { date: periodEndDisplay })
        }
        confirmAction={isTeam ? t("cancelRenewalTeam") : t("cancelRenewal")}
        confirmDismiss={t("cancelRenewalKeep")}
        context={buttonContext}
      />
    ) : null;

  const eyebrowLabel = isTeam ? t("currentTeamPlan") : t("currentPersonalPlan");

  const headerAction =
    canManage && !isFullyCanceled ? (
      <BillingPortalButton context={buttonContext}>
        {t("portal")}
      </BillingPortalButton>
    ) : null;

  // Banner content. Mutually exclusive: cancel banner > downgrade banner >
  // active-renewal banner. Cancel takes precedence over downgrade because
  // Stripe releases the schedule on cancel; downgrade takes precedence over
  // active-renewal because both states already host Cancel renewal.
  const scheduledChangeDate = subscription.scheduledChangeAt
    ? new Date(subscription.scheduledChangeAt)
    : null;
  const scheduledChangeDisplay =
    isScheduledDowngrade && scheduledChangeDate
      ? formatLongDate(scheduledChangeDate, locale)
      : "";
  const scheduledPlanName =
    isScheduledDowngrade && scheduledPlan
      ? translatePlanName(tPlans, scheduledPlan)
      : "";

  // Cancel banner quotes `cancelAt` (the actual scheduled cutover, set by
  // Stripe when the user clicked cancel-renewal), not `currentPeriodEnd` —
  // they can differ when the sub was scheduled to cancel mid-period.
  const cancelAtDate = subscription.cancelAt
    ? new Date(subscription.cancelAt)
    : null;
  const cancelAtDisplay = cancelAtDate
    ? formatLongDate(cancelAtDate, locale)
    : "";

  const isActivelyRenewing =
    !isFullyCanceled && !isScheduledToCancel && !isScheduledDowngrade;
  const hasUpgradeCtas = upgradeCtas.length > 0;
  // Active-renewal banner only fires when there are upgrade CTAs to show.
  // On Pro (no higher tier) the banner would be a mostly-empty box with
  // a stranded Cancel renewal button — drop it and fall back to the
  // inline date-row link, which integrates cleanly with the renewal date.
  const showActiveRenewalBanner =
    isActivelyRenewing && canManage && hasUpgradeCtas;
  // Inline date-row Cancel renewal: shown for actively-renewing subs that
  // don't get the banner treatment (i.e. top-tier subs with no upgrades).
  const dateAction =
    isActivelyRenewing && canManage && !hasUpgradeCtas
      ? cancelRenewalAction
      : null;

  let banner: React.ReactNode = null;
  if (isScheduledToCancel && canManage) {
    banner = (
      <AlertBanner variant="warning">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium">
              {t("scheduledCancelHeadline", { date: cancelAtDisplay })}
            </p>
            <p className="text-xs">{t("scheduledCancelBody")}</p>
          </div>
          <BillingActionButton
            action={resumeSubscription}
            context={buttonContext}
          >
            {t("resumeSubscription")}
          </BillingActionButton>
        </div>
      </AlertBanner>
    );
  } else if (isScheduledDowngrade && canManage) {
    banner = (
      <AlertBanner variant="info">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium">
              {t("scheduledDowngradeHeadline", {
                plan: scheduledPlanName,
                date: scheduledChangeDisplay,
              })}
            </p>
            <p className="text-xs">
              {t("scheduledDowngradeBody", { plan: planName })}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            {cancelRenewalAction}
            <BillingActionButton
              action={releaseScheduledChange}
              context={buttonContext}
            >
              {t("keepCurrentPlan", { plan: planName })}
            </BillingActionButton>
          </div>
        </div>
      </AlertBanner>
    );
  } else if (showActiveRenewalBanner) {
    banner = (
      <AlertBanner variant="neutral">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {upgradeCtas.map((cta, i) => (
              <span key={i}>{cta}</span>
            ))}
          </div>
          {cancelRenewalAction && (
            <div className="flex flex-shrink-0 items-center">
              {cancelRenewalAction}
            </div>
          )}
        </div>
      </AlertBanner>
    );
  }

  // The cancel/downgrade banners restate the cutover date in their
  // headline, so suppressing the date row keeps the card from repeating
  // itself. The active-renewal banner does NOT mention the renewal date,
  // so we keep the date row visible alongside it.
  const showDateRow = hasValidDate && (!banner || showActiveRenewalBanner);

  return (
    <SubscriptionCard
      eyebrowLabel={eyebrowLabel}
      planName={planName}
      status={subscription.status}
      statusLabel={subscription.status}
      subtitle={subtitle ?? undefined}
      currentPeriodEndIso={showDateRow ? dateValue.toISOString() : undefined}
      periodEndLocale={locale}
      periodEndLabel={showDateRow ? dateLabel : undefined}
      headerAction={headerAction ?? undefined}
      dateAction={dateAction ?? undefined}
      banner={banner ?? undefined}
      footer={
        isTeam && !canManage && teamOwnerName
          ? t("managedBy", { name: teamOwnerName })
          : undefined
      }
    />
  );
}
