import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCallbackClient } from "./_components/AuthCallbackClient";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.callback" });
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function AuthCallbackPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth.callback");
  return (
    <AuthCallbackClient
      completingLabel={t("completing")}
      noscriptLabel={t("noscript")}
      backToLoginLabel={t("backToLogin")}
    />
  );
}
