"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { signIn } from "@/app/actions/auth";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const [state, formAction, pending] = useActionState(signIn, null);

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
          autoComplete="current-password"
        />
        <Button type="submit" loading={pending} className="w-full">
          {t("submit")}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        {t("noAccount")}{" "}
        <Link
          href="/signup"
          className="text-primary-600 hover:text-primary-500 font-medium"
        >
          {t("register")}
        </Link>
      </p>
    </AuthLayout>
  );
}
