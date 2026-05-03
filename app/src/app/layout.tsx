import { inter } from "@/lib/fonts";
import { routing, RTL_LOCALES, isLocale } from "@/lib/i18n/routing";
import { getPathname } from "@/lib/pathname";
import "./globals.css";

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const pathname = await getPathname();
  const segment = pathname.split("/")[1] ?? "";
  const locale = isLocale(segment) ? segment : routing.defaultLocale;
  const dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
