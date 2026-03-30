import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "../_components/AuthForm";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage() {
  const t = await getTranslations("auth.login");

  return (
    <AuthLayout appName="Meridian" title={t("title")}>
      <AuthForm
        action={signIn}
        translationNamespace="auth.login"
        passwordAutoComplete="current-password"
        footerLink={{
          href: "/signup",
          textKey: "noAccount",
          linkKey: "register",
        }}
      />
    </AuthLayout>
  );
}
