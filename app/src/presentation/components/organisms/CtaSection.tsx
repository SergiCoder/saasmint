"use client";

import { Input } from "../atoms/Input";
import { Button } from "../atoms/Button";

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
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="from-primary-50 border-primary-200 rounded-2xl border bg-gradient-to-br to-purple-50 px-8 py-14 text-center sm:px-16">
          <p className="text-primary-600 mb-3 flex items-center justify-center gap-2 text-xs font-semibold tracking-widest uppercase">
            <span className="bg-primary-600 inline-block h-0.5 w-3.5 rounded-full" />
            {label}
          </p>
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
