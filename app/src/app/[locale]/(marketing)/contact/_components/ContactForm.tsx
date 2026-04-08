"use client";

import { Input } from "@/presentation/components/atoms/Input";
import { Button } from "@/presentation/components/atoms/Button";

interface ContactFormProps {
  placeholder: string;
  messagePlaceholder: string;
  submitLabel: string;
}

export function ContactForm({
  placeholder,
  messagePlaceholder,
  submitLabel,
}: ContactFormProps) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
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
        className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:outline-none"
      />
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
