import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: [
    "en",
    "es",
    "fr",
    "de",
    "pt-BR",
    "it",
    "ja",
    "zh-CN",
    "nl",
    "ar",
    "ko",
    "ru",
    "pl",
    "tr",
    "sv",
    "id",
    "zh-TW",
    "da",
    "nb",
    "pt-PT",
  ],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (routing.locales as readonly string[]).includes(value)
  );
}
