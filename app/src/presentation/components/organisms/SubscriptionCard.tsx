import { Badge } from "../atoms/Badge";
import { FormattedDate } from "../atoms/FormattedDate";
import { CARD_CLASS, EYEBROW_LABEL_CLASS } from "@/lib/styles";

const statusVariant = {
  active: "success",
  trialing: "info",
  past_due: "warning",
  canceled: "error",
  unpaid: "error",
  incomplete: "warning",
  incomplete_expired: "error",
  paused: "warning",
} as const;

export interface SubscriptionCardProps {
  eyebrowLabel?: string;
  planName: string;
  status: keyof typeof statusVariant;
  statusLabel: string;
  subtitle?: React.ReactNode;
  currentPeriodEndIso?: string;
  periodEndLocale?: string;
  periodEndLabel?: string;
  /**
   * Optional inline action rendered next to the date row (e.g. "Cancel
   * renewal" link on an actively-renewing sub). Aligned right; the row only
   * appears when both `currentPeriodEndIso` + `periodEndLabel` are set.
   */
  dateAction?: React.ReactNode;
  /**
   * Optional inline action rendered in the card header next to the status
   * badge (e.g. "Manage billing" button). Top-right corner of the card.
   */
  headerAction?: React.ReactNode;
  footer?: string;
  /**
   * Optional in-card banner rendered below the header (e.g. scheduled
   * downgrade or scheduled cancel notice). The caller controls the banner's
   * own styling so a single card can host info / warning / error variants
   * without the organism encoding any of them.
   */
  banner?: React.ReactNode;
  className?: string;
}

export function SubscriptionCard({
  eyebrowLabel,
  planName,
  status,
  statusLabel,
  subtitle,
  currentPeriodEndIso,
  periodEndLocale,
  periodEndLabel,
  dateAction,
  headerAction,
  footer,
  banner,
  className = "",
}: SubscriptionCardProps) {
  return (
    <div className={`${CARD_CLASS} ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrowLabel && (
            <p className={EYEBROW_LABEL_CLASS}>{eyebrowLabel}</p>
          )}
          <h3 className="mt-1 text-lg font-semibold text-gray-900">
            {planName}
          </h3>
          {subtitle && (
            <div className="mt-1 text-sm text-gray-500">{subtitle}</div>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          {/* "active" is the routine state; the date row + banners already
              convey it. Show the badge only for non-routine states (trial,
              past_due, unpaid, canceled, etc.) where it adds information. */}
          {status !== "active" && (
            <Badge variant={statusVariant[status]}>{statusLabel}</Badge>
          )}
          {headerAction}
        </div>
      </div>

      {currentPeriodEndIso && periodEndLabel && periodEndLocale && (
        <dl className="mt-6 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-500">{periodEndLabel}</dt>
            <dd className="flex items-center gap-3 font-medium text-gray-900">
              <FormattedDate
                iso={currentPeriodEndIso}
                locale={periodEndLocale}
              />
              {dateAction}
            </dd>
          </div>
        </dl>
      )}

      {banner && <div className="mt-6">{banner}</div>}

      {footer && <p className="mt-4 text-sm text-gray-500">{footer}</p>}
    </div>
  );
}
