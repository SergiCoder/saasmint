import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { VerifyEmailClient } from "./_components/VerifyEmailClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verifyEmail");
  return { title: t("pageTitle") };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations("auth.verifyEmail");
  const { token } = await searchParams;

  return (
    <AuthLayout appName="SaaSmint" title={t("title")}>
      <VerifyEmailClient token={token} />
    </AuthLayout>
  );
}
