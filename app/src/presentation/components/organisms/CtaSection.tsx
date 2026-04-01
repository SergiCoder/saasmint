import { Input } from "../atoms/Input";
import { Button } from "../atoms/Button";
import { SectionLabel } from "../atoms/SectionLabel";

export interface CtaSectionProps {
  label: string;
  title: string;
  subtitle: string;
  inputPlaceholder: string;
  buttonText: string;
  className?: string;
}

export function CtaSection({
  label,
  title,
  subtitle,
  inputPlaceholder,
  buttonText,
  className = "",
}: CtaSectionProps) {
  return (
    <section className={`border-t border-gray-200 bg-white py-16 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="border-primary-200 from-primary-50 rounded-2xl border bg-gradient-to-br via-emerald-50 to-cyan-50 px-8 py-14 text-center sm:px-16">
          <SectionLabel centered>{label}</SectionLabel>
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h2>
          <p className="mb-8 text-base text-gray-500">{subtitle}</p>
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Input
              placeholder={inputPlaceholder}
              type="email"
              className="w-full sm:w-64"
            />
            <Button variant="primary">{buttonText}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
