"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  "pt-BR": "Português (BR)",
  it: "Italiano",
  ja: "日本語",
  "zh-CN": "简体中文",
  nl: "Nederlands",
  ar: "العربية",
  ko: "한국어",
  ru: "Русский",
  pl: "Polski",
  tr: "Türkçe",
  sv: "Svenska",
  id: "Bahasa Indonesia",
  "zh-TW": "繁體中文",
  da: "Dansk",
  nb: "Norsk bokmål",
  "pt-PT": "Português (PT)",
};

export function LocaleDropdown() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchLocale(next: Locale) {
    setOpen(false);
    router.replace(pathname, { locale: next });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.97.633-3.794 1.708-5.282"
          />
        </svg>
        {locale.toUpperCase()}
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 max-h-60 w-48 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {Object.entries(LOCALE_LABELS).map(([code, label]) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={code === locale}
                onClick={() => switchLocale(code as Locale)}
                className={`w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-gray-100 ${
                  code === locale
                    ? "text-primary-600 font-medium"
                    : "text-gray-700"
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
