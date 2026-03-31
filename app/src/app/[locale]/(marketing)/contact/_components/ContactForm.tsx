"use client";

import { Input } from "@/presentation/components/atoms/Input";
import { Button } from "@/presentation/components/atoms/Button";

interface ContactFormProps {
  placeholder: string;
  submitLabel: string;
}

export function ContactForm({ placeholder, submitLabel }: ContactFormProps) {
  return (
    <form
      className="flex gap-3"
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
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
