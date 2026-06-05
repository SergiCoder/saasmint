export interface MetricCardProps {
  title: string;
  value: string;
  change?: { value: string; positive: boolean };
  compact?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  compact = false,
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white ${compact ? "p-3" : "p-6 shadow-sm"} ${className}`}
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {change && (
        <p
          className={`mt-2 text-sm font-medium ${change.positive ? "text-green-600" : "text-red-600"}`}
        >
          {change.positive ? "\u2191" : "\u2193"} {change.value}
        </p>
      )}
    </div>
  );
}
