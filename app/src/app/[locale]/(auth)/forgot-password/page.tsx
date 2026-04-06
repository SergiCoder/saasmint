import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { resetPassword } from "@/app/actions/auth";
import { ForgotPasswordForm } from "./_components/ForgotPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgotPassword");
  return { title: t("pageTitle") };
}

export default async function ForgotPasswordPage() {
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
