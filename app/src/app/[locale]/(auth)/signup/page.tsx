import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "../_components/AuthForm";

export const metadata: Metadata = {
  title: "Sign up",
};

export default async function SignupPage() {
  const t = await getTranslations("auth.register");

  return (
    <AuthLayout appName="Meridian" title={t("title")}>
      <AuthForm
        action={signUp}
        translationNamespace="auth.register"
        passwordAutoComplete="new-password"
        footerLink={{
          href: "/login",
          textKey: "hasAccount",
          linkKey: "login",
        }}
      />
    </AuthLayout>
  );
}
