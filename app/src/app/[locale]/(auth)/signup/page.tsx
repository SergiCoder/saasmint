import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { OAuthButtons } from "@/presentation/components/molecules/OAuthButtons";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "../_components/AuthForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("pageTitle") };
}

interface SignupPageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const t = await getTranslations("auth.register");
  const { plan } = await searchParams;
  const loginHref = plan ? `/login?plan=${encodeURIComponent(plan)}` : "/login";

  return (
    <AuthLayout appName="SaaSmint" title={t("title")}>
      <OAuthButtons plan={plan} />
      <AuthForm
        action={signUp}
        translationNamespace="auth.register"
        passwordAutoComplete="new-password"
        showNameField
        hiddenFields={plan ? { plan } : undefined}
        footerLink={{
          href: loginHref,
          textKey: "hasAccount",
          linkKey: "login",
        }}
      />
    </AuthLayout>
  );
}
