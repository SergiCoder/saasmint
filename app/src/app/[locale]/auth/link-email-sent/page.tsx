import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { APP_NAME } from "@/lib/appVersion";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "auth.linkEmailSent",
  });
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function LinkEmailSentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth.linkEmailSent");

  return (
    <AuthLayout appName={APP_NAME} title={t("title")}>
      <p className="text-center text-sm text-gray-600">{t("body")}</p>
    </AuthLayout>
  );
}
