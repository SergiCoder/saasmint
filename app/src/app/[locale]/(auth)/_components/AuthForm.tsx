"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { PasswordRequirements } from "@/presentation/components/molecules/PasswordRequirements";
import { Button } from "@/presentation/components/atoms/Button";
import type { ActionResult } from "@/lib/actions/ActionResult";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";
import { ResendVerificationLink } from "./ResendVerificationLink";

interface AuthFormProps {
  action: (prev: unknown, fd: FormData) => Promise<ActionResult>;
  translationNamespace: string;
  passwordAutoComplete: string;
  showNameField?: boolean;
  forgotPasswordHref?: string;
  footerLink: { href: string; textKey: string; linkKey: string };
  serverAlerts?: React.ReactNode;
  hiddenFields?: Record<string, string>;
}

export function AuthForm({
  action,
  translationNamespace,
  passwordAutoComplete,
  showNameField = false,
  forgotPasswordHref,
  footerLink,
  serverAlerts,
  hiddenFields,
}: AuthFormProps) {
  const t = useTranslations(translationNamespace);
  const translateError = useActionErrorMessage();
  const [state, formAction, pending] = useActionState(action, null);
  const [email, setEmail] = useState("");
  const errorMessage = state && !state.ok ? translateError(state) : null;
  const showResendLink =
    state && !state.ok && state.code === "email_not_verified";

  return (
    <>
      {errorMessage ? (
        <AlertBanner variant="error" className="mb-4">
          {errorMessage}
          {showResendLink && <ResendVerificationLink email={email} />}
        </AlertBanner>
      ) : (
        serverAlerts
      )}
      <form action={formAction} className="space-y-4">
        {hiddenFields &&
          Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label={t("password")}
          name="password"
          type="password"
          required
          minLength={showNameField ? PASSWORD_MIN_LENGTH : undefined}
          autoComplete={passwordAutoComplete}
        />
        {showNameField && <PasswordRequirements />}
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
