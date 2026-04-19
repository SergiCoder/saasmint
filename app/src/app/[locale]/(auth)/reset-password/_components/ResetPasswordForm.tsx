"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";

interface ResetPasswordFormProps {
  action: (
    prev: unknown,
    fd: FormData,
  ) => Promise<
    { error: string; success?: never } | { success: boolean; error?: never }
  >;
  token?: string;
}

export function ResetPasswordForm({ action, token }: ResetPasswordFormProps) {
  const t = useTranslations("auth.resetPassword");
  const [state, formAction, pending] = useActionState(action, null);

  if (state && "success" in state) {
    return (
      <>
        <AlertBanner variant="success">{t("successMessage")}</AlertBanner>
        <p className="mt-4 text-center text-sm text-gray-600">
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

  return (
    <>
      {state?.error && (
        <AlertBanner variant="error" className="mb-4">
          {state.error}
        </AlertBanner>
      )}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token ?? ""} />
        <FormField
          label={t("newPassword")}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <FormField
          label={t("confirmPassword")}
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Button type="submit" loading={pending} className="mt-6 w-full">
          {t("submit")}
        </Button>
      </form>
    </>
  );
}
