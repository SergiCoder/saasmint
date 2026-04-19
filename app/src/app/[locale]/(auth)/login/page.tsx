import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { OAuthButtons } from "@/presentation/components/molecules/OAuthButtons";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "../_components/AuthForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.login" });
  return { title: t("pageTitle") };
}

const ERROR_KEYS: Record<string, string> = {
  NO_SESSION: "errorNoSession",
  email_not_verified: "errorEmailNotVerified",
  token_expired: "errorTokenExpired",
  account_deactivated: "errorAccountDeactivated",
  BACKEND_REJECTED: "errorBackendRejected",
  account_deleted: "accountDeleted",
  oauth_error: "errorOAuth",
};

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    error?: string;
    registered?: string;
    deleted?: string;
    plan?: string;
    context?: string;
  }>;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, { error, registered, deleted, plan, context }] = await Promise.all([
    getTranslations("auth.login"),
    searchParams,
  ]);
  const isTeam = context === "team";

  const errorKey = error ? ERROR_KEYS[error] : undefined;
  const signupParams = new URLSearchParams();
  if (plan) signupParams.set("plan", plan);
  if (isTeam) signupParams.set("context", "team");
  const signupHref =
    signupParams.size > 0 ? `/signup?${signupParams.toString()}` : "/signup";

  const hiddenFields: Record<string, string> = {};
  if (plan) hiddenFields.plan = plan;
  if (isTeam) hiddenFields.context = "team";

  return (
    <AuthLayout appName="SaaSmint" title={t("title")}>
      <OAuthButtons plan={plan} context={isTeam ? "team" : undefined} />
      <AuthForm
        action={signIn}
        translationNamespace="auth.login"
        passwordAutoComplete="current-password"
        forgotPasswordHref="/forgot-password"
        hiddenFields={
          Object.keys(hiddenFields).length > 0 ? hiddenFields : undefined
        }
        footerLink={{
          href: signupHref,
          textKey: "noAccount",
          linkKey: "register",
        }}
        serverAlerts={
          <>
            {errorKey && (
              <AlertBanner
                variant={error === "account_deleted" ? "success" : "error"}
                className="mb-4"
              >
                {t(errorKey)}
              </AlertBanner>
            )}
            {registered && (
              <AlertBanner variant="success" className="mb-4">
                {t("registered")}
              </AlertBanner>
            )}
            {deleted && (
              <AlertBanner variant="success" className="mb-4">
                {t("accountDeleted")}
              </AlertBanner>
            )}
          </>
        }
      />
    </AuthLayout>
  );
}
