export interface StatItemProps {
  value: string;
  label: string;
  className?: string;
}

export function StatItem({ value, label, className = "" }: StatItemProps) {
  return (
    <div className={`bg-white px-8 py-9 ${className}`}>
      <p className="text-5xl font-bold tracking-tighter text-gray-900">
        {value}
      </p>
      <p className="mt-1.5 text-sm text-gray-500">{label}</p>
    </div>
  );
}
