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
  showNameField?: boolean;
  forgotPasswordHref?: string;
  footerLink: { href: string; textKey: string; linkKey: string };
  serverAlerts?: React.ReactNode;
}

export function AuthForm({
  action,
  translationNamespace,
  passwordAutoComplete,
  showNameField = false,
  forgotPasswordHref,
  footerLink,
  serverAlerts,
}: AuthFormProps) {
  const t = useTranslations(translationNamespace);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <>
      {state?.error ? (
        <AlertBanner variant="error" className="mb-4">
          {state.error}
        </AlertBanner>
      ) : (
        serverAlerts
      )}
      <form action={formAction} className="space-y-4">
        {showNameField && (
          <FormField
            label={t("fullName")}
            name="fullName"
            required
            minLength={3}
            maxLength={255}
            autoComplete="name"
          />
        )}
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
        {forgotPasswordHref && (
          <div className="text-right">
            <Link
              href={forgotPasswordHref}
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              {t("forgotPassword")}
            </Link>
          </div>
        )}
        <Button type="submit" loading={pending} className="mt-6 w-full">
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
