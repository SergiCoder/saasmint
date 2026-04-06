"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";

interface ForgotPasswordFormProps {
  action: (
    prev: unknown,
    fd: FormData,
  ) => Promise<
    { error: string; success?: never } | { success: boolean; error?: never }
  >;
}

export function ForgotPasswordForm({ action }: ForgotPasswordFormProps) {
  const t = useTranslations("auth.forgotPassword");
  const [state, formAction, pending] = useActionState(action, null);

  if (state && "success" in state) {
    return <AlertBanner variant="success">{t("successMessage")}</AlertBanner>;
  }

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
        <Button type="submit" loading={pending} className="mt-6 w-full">
          {t("submit")}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        {t("rememberPassword")}{" "}
        <Link
          href="/login"
          className="text-primary-600 hover:text-primary-500 font-medium"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </>
  );
}
