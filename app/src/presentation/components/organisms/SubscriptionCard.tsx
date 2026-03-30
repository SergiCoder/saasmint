import { Badge } from "../atoms/Badge";

const statusVariant = {
  active: "success",
  trialing: "info",
  past_due: "warning",
  canceled: "error",
  unpaid: "error",
  incomplete: "warning",
} as const;

export interface SubscriptionCardProps {
  planName: string;
  status: keyof typeof statusVariant;
  statusLabel: string;
  interval: string;
  price: string;
  currentPeriodEnd: string;
  periodEndLabel: string;
  cancelAtPeriodEnd: boolean;
  cancelLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SubscriptionCard({
  planName,
  status,
  statusLabel,
  interval,
  price,
  currentPeriodEnd,
  periodEndLabel,
  cancelAtPeriodEnd,
  cancelLabel,
  actions,
  className = "",
}: SubscriptionCardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{planName}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {price}/{interval}
          </p>
        </div>
        <Badge variant={statusVariant[status]}>{statusLabel}</Badge>
      </div>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">{periodEndLabel}</dt>
          <dd className="font-medium text-gray-900">{currentPeriodEnd}</dd>
        </div>
      </dl>

      {cancelAtPeriodEnd && cancelLabel && (
        <p className="mt-4 text-sm text-yellow-700">{cancelLabel}</p>
      )}

      {actions && <div className="mt-6 flex gap-3">{actions}</div>}
    </div>
  );
}
