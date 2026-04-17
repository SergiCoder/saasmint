import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCallbackClient } from "./_components/AuthCallbackClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.callback");
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function AuthCallbackPage() {
  const t = await getTranslations("auth.callback");
  return (
    <AuthCallbackClient
      completingLabel={t("completing")}
      noscriptLabel={t("noscript")}
      backToLoginLabel={t("backToLogin")}
    />
  );
}
