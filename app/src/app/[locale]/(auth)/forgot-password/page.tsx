import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { resetPassword } from "@/app/actions/auth";
import { ForgotPasswordForm } from "./_components/ForgotPasswordForm";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.forgotPassword" });
  return { title: t("pageTitle") };
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth.forgotPassword");

  return (
    <AuthLayout appName="SaaSmint" title={t("title")}>
      <p className="mb-6 text-center text-sm text-gray-600">
        {t("description")}
      </p>
      <ForgotPasswordForm action={resetPassword} />
    </AuthLayout>
  );
}
