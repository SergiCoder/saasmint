export interface PlanCardProps {
  name: string;
  price: string;
  interval: string;
  /** Optional sub-label shown below the price (e.g. "$15.83/month billed yearly"). */
  priceSubLabel?: string;
  description?: string;
  highlighted?: boolean;
  cta: React.ReactNode;
  className?: string;
}

export function PlanCard({
  name,
  price,
  interval,
  priceSubLabel,
  description,
  highlighted = false,
  cta,
  className = "",
}: PlanCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border p-8 ${
        highlighted
          ? "border-primary-500 shadow-lg"
          : "border-gray-200 shadow-sm"
      } ${className}`}
    >
      <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
      <p className="mt-4">
        <span className="text-4xl font-bold text-gray-900">{price}</span>
        <span className="text-sm text-gray-500">/{interval}</span>
      </p>
      {priceSubLabel && (
        <p className="mt-1 text-sm text-gray-500">{priceSubLabel}</p>
      )}
      {description && (
        <p className="mt-4 text-sm text-gray-500">{description}</p>
      )}
      <div className="mt-auto pt-8">{cta}</div>
    </div>
  );
}
