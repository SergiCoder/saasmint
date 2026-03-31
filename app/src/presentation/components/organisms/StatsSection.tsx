import { StatItem, type StatItemProps } from "../molecules/StatItem";

export interface StatsSectionProps {
  stats: Omit<StatItemProps, "className">[];
  className?: string;
}

export function StatsSection({ stats, className = "" }: StatsSectionProps) {
  return (
    <section className={`border-y border-gray-200 bg-white py-16 ${className}`}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid divide-x divide-gray-200 overflow-hidden rounded-xl border border-gray-200 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
