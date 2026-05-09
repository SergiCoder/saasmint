import { Badge } from "@/presentation/components/atoms/Badge";
import { formatInteger } from "@/lib/formatInteger";

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
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
            {eyebrowLabel}
          </p>
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
