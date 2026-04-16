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
  searchParams: Promise<{ plan?: string; context?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const t = await getTranslations("auth.register");
  const { plan, context } = await searchParams;
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
