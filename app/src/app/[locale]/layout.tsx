import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale, routing } from "@/lib/i18n/routing";
import { env } from "@/lib/env";
import { APP_NAME } from "@/lib/appVersion";
import { CookieNotice } from "@/presentation/components/organisms";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: "The platform teams actually ship with.",
  openGraph: {
    type: "website",
    siteName: APP_NAME,
  },
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("cookieNotice");

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
      <CookieNotice
        message={t("message")}
        learnMoreLabel={t("learnMore")}
        learnMoreHref="/cookies"
        dismissLabel={t("dismiss")}
        regionLabel={t("regionLabel")}
      />
    </NextIntlClientProvider>
  );
}
