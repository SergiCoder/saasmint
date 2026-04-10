import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { resetPasswordWithToken } from "@/app/actions/auth";
import { ResetPasswordForm } from "./_components/ResetPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.resetPassword");
  return { title: t("pageTitle") };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations("auth.resetPassword");
  const { token } = await searchParams;

  return (
    <AuthLayout appName="SaaSmint" title={t("title")}>
      {token ? (
        <ResetPasswordForm action={resetPasswordWithToken} token={token} />
      ) : (
        <>
          <AlertBanner variant="error">{t("invalidLink")}</AlertBanner>
          <p className="mt-4 text-center text-sm text-gray-600">
            <Link
              href="/forgot-password"
              className="text-primary-600 hover:text-primary-500 font-medium"
            >
              {t("requestNewLink")}
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
