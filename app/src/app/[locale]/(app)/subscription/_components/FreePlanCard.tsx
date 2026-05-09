import { Badge } from "@/presentation/components/atoms/Badge";
import { CARD_CLASS, EYEBROW_LABEL_CLASS } from "@/lib/styles";

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
    <div className={CARD_CLASS}>
      <div className="flex items-start justify-between">
        <div>
          <p className={EYEBROW_LABEL_CLASS}>{eyebrowLabel}</p>
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
