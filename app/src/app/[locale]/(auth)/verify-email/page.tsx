import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { VerifyEmailClient } from "./_components/VerifyEmailClient";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.verifyEmail" });
  return { title: t("pageTitle") };
}

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, { token }] = await Promise.all([
    getTranslations("auth.verifyEmail"),
    searchParams,
  ]);

  return (
    <AuthLayout appName="SaaSmint" title={t("title")}>
      <VerifyEmailClient token={token} />
    </AuthLayout>
  );
}
