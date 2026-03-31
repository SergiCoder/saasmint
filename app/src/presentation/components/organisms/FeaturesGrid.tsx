import { SectionLabel } from "../atoms/SectionLabel";
import { FeatureCard, type FeatureCardProps } from "../molecules/FeatureCard";

export interface FeaturesGridProps {
  id?: string;
  label: string;
  title: string;
  subtitle: string;
  features: Omit<FeatureCardProps, "className">[];
  className?: string;
}

export function FeaturesGrid({
  id,
  label,
  title,
  subtitle,
  features,
  className = "",
}: FeaturesGridProps) {
  return (
    <section id={id} className={`py-20 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <SectionLabel>{label}</SectionLabel>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 max-w-md text-base text-gray-500">{subtitle}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
