export interface StatItemProps {
  value: string;
  label: string;
  className?: string;
}

export function StatItem({ value, label, className = "" }: StatItemProps) {
  return (
    <div className={`bg-white p-8 ${className}`}>
      <p className="text-4xl font-bold tracking-tight text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}
