import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { OAuthButtons } from "@/presentation/components/molecules/OAuthButtons";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "../_components/AuthForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
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
  searchParams: Promise<{
    error?: string;
    registered?: string;
    deleted?: string;
  }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const t = await getTranslations("auth.login");
  const { error, registered, deleted } = await searchParams;

  const errorKey = error ? ERROR_KEYS[error] : undefined;

  return (
    <AuthLayout appName="SaaSmint" title={t("title")}>
      <OAuthButtons />
      <AuthForm
        action={signIn}
        translationNamespace="auth.login"
        passwordAutoComplete="current-password"
        forgotPasswordHref="/forgot-password"
        footerLink={{
          href: "/signup",
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
