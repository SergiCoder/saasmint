import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "../_components/AuthForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("pageTitle") };
}

export default async function SignupPage() {
  const t = await getTranslations("auth.register");

  return (
    <AuthLayout appName="SaaSmint" title={t("title")}>
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
