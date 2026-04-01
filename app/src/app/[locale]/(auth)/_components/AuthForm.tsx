"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";

interface AuthFormProps {
  action: (prev: unknown, fd: FormData) => Promise<{ error: string } | void>;
  translationNamespace: string;
  passwordAutoComplete: string;
  footerLink: { href: string; textKey: string; linkKey: string };
}

export function AuthForm({
  action,
  translationNamespace,
  passwordAutoComplete,
  footerLink,
}: AuthFormProps) {
  const t = useTranslations(translationNamespace);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <>
      {state?.error && (
        <AlertBanner variant="error" className="mb-4">
          {state.error}
        </AlertBanner>
      )}
      <form action={formAction} className="space-y-4">
        <FormField
          label={t("email")}
          name="email"
          type="email"
          required
          autoComplete="email"
        />
        <FormField
          label={t("password")}
          name="password"
          type="password"
          required
          autoComplete={passwordAutoComplete}
        />
        <Button type="submit" loading={pending} className="w-full">
          {t("submit")}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        {t(footerLink.textKey)}{" "}
        <Link
          href={footerLink.href}
          className="text-primary-600 hover:text-primary-500 font-medium"
        >
          {t(footerLink.linkKey)}
        </Link>
      </p>
    </>
  );
}
