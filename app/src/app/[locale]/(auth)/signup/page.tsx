"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { signUp } from "@/app/actions/auth";

export default function SignupPage() {
  const t = useTranslations("auth.register");
  const [state, formAction, pending] = useActionState(signUp, null);

  return (
    <AuthLayout appName="Meridian" title={t("title")}>
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
          autoComplete="new-password"
        />
        <Button type="submit" loading={pending} className="w-full">
          {t("submit")}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="text-primary-600 hover:text-primary-500 font-medium"
        >
          {t("login")}
        </Link>
      </p>
    </AuthLayout>
  );
}
