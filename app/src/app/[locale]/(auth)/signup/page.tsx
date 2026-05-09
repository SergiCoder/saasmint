import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { OAuthButtons } from "@/presentation/components/molecules/OAuthButtons";
import { signUp } from "@/app/actions/auth";
import { APP_NAME } from "@/lib/appVersion";
import { AuthForm } from "../_components/AuthForm";
import { buildPlanParams } from "../_lib/planParams";

interface SignupPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string; context?: string }>;
}

export async function generateMetadata({
  params,
}: SignupPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.register" });
  return { title: t("pageTitle") };
}

export default async function SignupPage({
  params,
  searchParams,
}: SignupPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, { plan, context }] = await Promise.all([
    getTranslations("auth.register"),
    searchParams,
  ]);
  const isTeam = context === "team";
  const planParams = buildPlanParams(plan, isTeam);
  const loginHref = planParams.href("/login");
  const hiddenFields = planParams.hiddenFields;

  return (
    <AuthLayout appName={APP_NAME} title={t("title")}>
      <OAuthButtons plan={plan} context={isTeam ? "team" : undefined} />
      <AuthForm
        action={signUp}
        translationNamespace="auth.register"
        passwordAutoComplete="new-password"
        showNameField
        hiddenFields={hiddenFields}
        footerLink={{
          href: loginHref,
          textKey: "hasAccount",
          linkKey: "login",
        }}
      />
    </AuthLayout>
  );
}
