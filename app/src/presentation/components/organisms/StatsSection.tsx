import { StatItem, type StatItemProps } from "../molecules/StatItem";

export interface StatsSectionProps {
  id?: string;
  stats: Omit<StatItemProps, "className">[];
  className?: string;
}

export function StatsSection({ id, stats, className = "" }: StatsSectionProps) {
  return (
    <section
      id={id}
      className={`border-y border-gray-200 bg-white py-20 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid divide-x divide-gray-200 overflow-hidden rounded-xl border border-gray-200 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
