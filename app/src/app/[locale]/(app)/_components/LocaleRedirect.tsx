"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { routing, type Locale } from "@/lib/i18n/routing";

export function LocaleRedirect({
  preferredLocale,
}: {
  preferredLocale: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (
      preferredLocale &&
      preferredLocale !== locale &&
      (routing.locales as readonly string[]).includes(preferredLocale)
    ) {
      router.replace(pathname, { locale: preferredLocale as Locale });
    }
  }, [preferredLocale, locale, router, pathname]);

  return null;
}
