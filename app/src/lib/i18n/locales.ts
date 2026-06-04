import { routing, type Locale } from "./routing";

const LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  "pt-BR": "Português (Brasil)",
  "pt-PT": "Português (Portugal)",
  ja: "日本語",
  "zh-CN": "中文 (简体)",
  "zh-TW": "中文 (繁體)",
  ko: "한국어",
  ru: "Русский",
  pl: "Polski",
  da: "Dansk",
  sv: "Svenska",
  nb: "Norsk Bokmål",
  nl: "Nederlands",
  ar: "العربية",
  tr: "Türkçe",
  id: "Bahasa Indonesia",
};

export interface LocaleEntry {
  readonly code: Locale;
  readonly label: string;
}

// Canonical list of supported locales with human-readable labels.
// Order follows `routing.locales`. `Record<Locale, string>` enforces that
// every locale in `routing.ts` has a label.
export const LOCALES: readonly LocaleEntry[] = routing.locales.map((code) => ({
  code,
  label: LABELS[code],
}));
