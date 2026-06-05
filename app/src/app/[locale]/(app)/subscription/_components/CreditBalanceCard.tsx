import { Badge } from "@/presentation/components/atoms/Badge";
import { formatInteger } from "@/lib/formatInteger";
import { CARD_CLASS, EYEBROW_LABEL_CLASS } from "@/lib/styles";

interface CreditBalanceCardProps {
  /** Section eyebrow, e.g. "Credit balance". */
  eyebrowLabel: string;
  /** Caller's current balance. */
  balance: number;
  /** Suffix unit shown after the balance, e.g. "credits". */
  unitLabel: string;
  /** Sentence describing the scope, e.g. "Personal — only you can spend these.". */
  description: string;
  /** Compact scope badge, e.g. "Personal" or "Team". */
  scopeBadge: string;
  /** Locale for number formatting (thousand separators, etc.). */
  locale: string;
}

export function CreditBalanceCard({
  eyebrowLabel,
  balance,
  unitLabel,
  description,
  scopeBadge,
  locale,
}: CreditBalanceCardProps) {
  const formattedBalance = formatInteger(balance, locale);

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start justify-between">
        <div>
          <p className={EYEBROW_LABEL_CLASS}>{eyebrowLabel}</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-gray-900">
              {formattedBalance}
            </span>
            <span className="text-sm text-gray-500">{unitLabel}</span>
          </p>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <Badge variant="info">{scopeBadge}</Badge>
      </div>
    </div>
  );
}
