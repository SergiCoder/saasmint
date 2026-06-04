"use client";

import { useActionState } from "react";
import { Input } from "../atoms/Input";
import { Button } from "../atoms/Button";
import { HoneypotInput } from "../atoms/HoneypotInput";
import { SectionLabel } from "../atoms/SectionLabel";
import { AlertBanner } from "../molecules/AlertBanner";
import { submitInquiry } from "@/app/actions/marketing";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

export interface CtaSectionProps {
  label: string;
  title: string;
  subtitle: string;
  inputPlaceholder: string;
  buttonText: string;
  successTitle: string;
  successBody: string;
  className?: string;
}

export function CtaSection({
  label,
  title,
  subtitle,
  inputPlaceholder,
  buttonText,
  successTitle,
  successBody,
  className = "",
}: CtaSectionProps) {
  const translateError = useActionErrorMessage();
  const [state, formAction, pending] = useActionState(submitInquiry, null);
  const submitted = state?.ok === true;

  return (
    <section className={`border-t border-gray-200 bg-white py-16 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="border-primary-200 from-primary-50 rounded-2xl border bg-gradient-to-br via-emerald-50 to-cyan-50 px-8 py-14 text-center sm:px-16">
          <SectionLabel centered>{label}</SectionLabel>
          {submitted ? (
            <>
              <h2 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {successTitle}
              </h2>
              <p className="text-base text-gray-500">{successBody}</p>
            </>
          ) : (
            <>
              <h2 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {title}
              </h2>
              <p className="mb-8 text-base text-gray-500">{subtitle}</p>
              {state && !state.ok && (
                <div className="mx-auto mb-4 max-w-md text-left">
                  <AlertBanner variant="error">
                    {translateError(state)}
                  </AlertBanner>
                </div>
              )}
              <form
                action={formAction}
                className="flex flex-col items-center justify-center gap-2 sm:flex-row"
              >
                <input type="hidden" name="source" value="landing-cta" />
                <HoneypotInput />
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder={inputPlaceholder}
                  className="w-full sm:w-64"
                />
                <Button type="submit" variant="primary" loading={pending}>
                  {buttonText}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
