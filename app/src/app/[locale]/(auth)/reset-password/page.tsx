import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { AuthLayout } from "@/presentation/components/templates/AuthLayout";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { resetPasswordWithToken } from "@/app/actions/auth";
import { ResetPasswordForm } from "./_components/ResetPasswordForm";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.resetPassword" });
  return { title: t("pageTitle") };
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, { token }] = await Promise.all([
    getTranslations("auth.resetPassword"),
    searchParams,
  ]);

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
