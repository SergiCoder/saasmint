export interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  className = "",
}: FeatureCardProps) {
  return (
    <div
      className={`hover:border-primary-200 rounded-xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      <div className="bg-primary-50 mb-4 flex h-10 w-10 items-center justify-center rounded-lg text-lg">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold tracking-tight text-gray-900">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-gray-500">{description}</p>
    </div>
  );
}
