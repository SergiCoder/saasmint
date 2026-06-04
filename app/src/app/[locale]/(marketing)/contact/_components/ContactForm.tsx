"use client";

import { useActionState } from "react";
import { Input } from "@/presentation/components/atoms/Input";
import { Button } from "@/presentation/components/atoms/Button";
import { HoneypotInput } from "@/presentation/components/atoms/HoneypotInput";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { submitInquiry } from "@/app/actions/marketing";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

interface ContactFormProps {
  placeholder: string;
  messagePlaceholder: string;
  submitLabel: string;
  successTitle: string;
  successBody: string;
}

export function ContactForm({
  placeholder,
  messagePlaceholder,
  submitLabel,
  successTitle,
  successBody,
}: ContactFormProps) {
  const translateError = useActionErrorMessage();
  const [state, formAction, pending] = useActionState(submitInquiry, null);

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <h2 className="text-lg font-semibold text-green-900">{successTitle}</h2>
        <p className="mt-1 text-sm text-green-800">{successBody}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && (
        <AlertBanner variant="error">{translateError(state)}</AlertBanner>
      )}
      <input type="hidden" name="source" value="contact-page" />
      <HoneypotInput />
      <Input
        type="email"
        name="email"
        placeholder={placeholder}
        required
        className="max-w-sm"
      />
      <textarea
        name="message"
        placeholder={messagePlaceholder}
        required
        rows={6}
        maxLength={5000}
        className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:outline-none"
      />
      <Button type="submit" loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
