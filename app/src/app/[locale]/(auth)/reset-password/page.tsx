import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { updatePassword } from "@/app/actions/auth";
import { ResetPasswordForm } from "./_components/ResetPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.resetPassword");
  return { title: t("pageTitle") };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth.resetPassword");

  return (
    <AuthLayout appName="SaaSmint" title={t("title")}>
      <ResetPasswordForm action={updatePassword} />
    </AuthLayout>
  );
}
