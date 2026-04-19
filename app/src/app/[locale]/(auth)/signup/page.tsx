import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { OAuthButtons } from "@/presentation/components/molecules/OAuthButtons";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "../_components/AuthForm";

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
  const loginParams = new URLSearchParams();
  if (plan) loginParams.set("plan", plan);
  if (isTeam) loginParams.set("context", "team");
  const loginHref =
    loginParams.size > 0 ? `/login?${loginParams.toString()}` : "/login";

  const hiddenFields: Record<string, string> = {};
  if (plan) hiddenFields.plan = plan;
  if (isTeam) hiddenFields.context = "team";

  return (
    <AuthLayout appName="SaaSmint" title={t("title")}>
      <OAuthButtons plan={plan} context={isTeam ? "team" : undefined} />
      <AuthForm
        action={signUp}
        translationNamespace="auth.register"
        passwordAutoComplete="new-password"
        showNameField
        hiddenFields={
          Object.keys(hiddenFields).length > 0 ? hiddenFields : undefined
        }
        footerLink={{
          href: loginHref,
          textKey: "hasAccount",
          linkKey: "login",
        }}
      />
    </AuthLayout>
  );
}
