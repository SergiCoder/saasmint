import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const RTL_LOCALES = new Set(["ar"]);

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: { default: "Meridian", template: "%s | Meridian" },
  description: "The platform teams actually ship with.",
  openGraph: {
    type: "website",
    siteName: "Meridian",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
