import { PlanCard, type PlanCardProps } from "../molecules/PlanCard";

export interface PricingTableProps {
  plans: Omit<PlanCardProps, "className">[];
  className?: string;
}

export function PricingTable({ plans, className = "" }: PricingTableProps) {
  return (
    <div className={`grid gap-8 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {plans.map((plan) => (
        <PlanCard key={plan.name} {...plan} />
      ))}
    </div>
  );
}
