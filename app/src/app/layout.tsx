import { inter } from "@/lib/fonts";
import { RTL_LOCALES } from "@/lib/i18n/routing";
import { getLocale } from "@/lib/pathname";
import "./globals.css";

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getLocale();
  const dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
