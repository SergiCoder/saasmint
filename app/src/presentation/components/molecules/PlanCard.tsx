import { Badge } from "../atoms/Badge";

export interface PlanCardProps {
  name: string;
  price: string;
  interval: string;
  /** Optional sub-label shown below the price (e.g. "$15.83/month billed yearly"). */
  priceSubLabel?: string;
  description?: string;
  features?: string[];
  highlighted?: boolean;
  highlightLabel?: string;
  cta: React.ReactNode;
  className?: string;
}

export function PlanCard({
  name,
  price,
  interval,
  priceSubLabel,
  description,
  features = [],
  highlighted = false,
  highlightLabel,
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
      {highlighted && highlightLabel && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="info">{highlightLabel}</Badge>
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
      <p className="mt-4">
        <span className="text-4xl font-bold text-gray-900">{price}</span>
        <span className="text-sm text-gray-500">/{interval}</span>
      </p>
      {priceSubLabel && (
        <p className="mt-1 text-xs text-gray-500">{priceSubLabel}</p>
      )}
      {description && (
        <p className="mt-4 text-sm text-gray-500">{description}</p>
      )}
      {features.length > 0 && (
        <ul className="mt-6 space-y-3">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-gray-600"
            >
              <svg
                className="text-primary-500 mt-0.5 h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-8">{cta}</div>
    </div>
  );
}
