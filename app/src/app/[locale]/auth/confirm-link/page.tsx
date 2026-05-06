import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { ConfirmLinkClient } from "./_components/ConfirmLinkClient";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.confirmLink" });
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function ConfirmLinkPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, { token }] = await Promise.all([
    getTranslations("auth.confirmLink"),
    searchParams,
  ]);

  return (
    <AuthLayout appName="SaaSmint" title={t("title")}>
      <ConfirmLinkClient token={token} />
    </AuthLayout>
  );
}
