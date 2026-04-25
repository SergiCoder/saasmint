import { Badge } from "@/presentation/components/atoms/Badge";

interface FreePlanCardProps {
  eyebrowLabel: string;
  planName: string;
  description: string;
  badgeLabel: string;
}

export function FreePlanCard({
  eyebrowLabel,
  planName,
  description,
  badgeLabel,
}: FreePlanCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
            {eyebrowLabel}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">
            {planName}
          </h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <Badge variant="info">{badgeLabel}</Badge>
      </div>
    </div>
  );
}
