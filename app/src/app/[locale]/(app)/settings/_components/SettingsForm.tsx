"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { Label } from "@/presentation/components/atoms/Label";
import { updateProfile } from "@/app/actions/user";
import type { User } from "@/domain/models/User";
import type { PhonePrefix } from "@/domain/models/PhonePrefix";

const SUPPORTED_LOCALES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "pt-PT", label: "Português (Portugal)" },
  { value: "ja", label: "日本語" },
  { value: "zh-CN", label: "中文 (简体)" },
  { value: "zh-TW", label: "中文 (繁體)" },
  { value: "ko", label: "한국어" },
  { value: "ru", label: "Русский" },
  { value: "pl", label: "Polski" },
  { value: "da", label: "Dansk" },
  { value: "sv", label: "Svenska" },
  { value: "nb", label: "Norsk Bokmål" },
  { value: "nl", label: "Nederlands" },
  { value: "ar", label: "العربية" },
  { value: "tr", label: "Türkçe" },
  { value: "id", label: "Bahasa Indonesia" },
] as const;

const SUPPORTED_CURRENCIES = [
  { value: "usd", label: "USD — US Dollar" },
  { value: "eur", label: "EUR — Euro" },
  { value: "gbp", label: "GBP — British Pound" },
  { value: "cad", label: "CAD — Canadian Dollar" },
  { value: "aud", label: "AUD — Australian Dollar" },
  { value: "chf", label: "CHF — Swiss Franc" },
  { value: "jpy", label: "JPY — Japanese Yen" },
  { value: "cny", label: "CNY — Chinese Yuan" },
  { value: "twd", label: "TWD — New Taiwan Dollar" },
  { value: "krw", label: "KRW — South Korean Won" },
  { value: "brl", label: "BRL — Brazilian Real" },
  { value: "sek", label: "SEK — Swedish Krona" },
  { value: "nok", label: "NOK — Norwegian Krone" },
  { value: "dkk", label: "DKK — Danish Krone" },
  { value: "pln", label: "PLN — Polish Złoty" },
  { value: "try", label: "TRY — Turkish Lira" },
  { value: "idr", label: "IDR — Indonesian Rupiah" },
  { value: "rub", label: "RUB — Russian Ruble" },
  { value: "sar", label: "SAR — Saudi Riyal" },
  { value: "aed", label: "AED — UAE Dirham" },
] as const;

interface SettingsFormProps {
  user: User;
  phonePrefixes: PhonePrefix[];
}

export function SettingsForm({ user, phonePrefixes }: SettingsFormProps) {
  const t = useTranslations("settings");
  const [state, formAction, pending] = useActionState(updateProfile, null);

  const selectClassName =
    "block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <AlertBanner variant="error">{state.error}</AlertBanner>}
      {state?.success && (
        <AlertBanner variant="success">{t("save")}</AlertBanner>
      )}
      <FormField
        label={t("fullName")}
        name="fullName"
        defaultValue={user.fullName ?? ""}
      />
      <FormField
        label={t("email")}
        name="email"
        type="email"
        defaultValue={user.email}
        disabled
      />
      <FormField
        label={t("jobTitle")}
        name="jobTitle"
        defaultValue={user.jobTitle ?? ""}
      />
      <div className="space-y-1">
        <Label htmlFor="phone">{t("phone")}</Label>
        <div className="flex gap-2">
          <select
            id="phonePrefix"
            name="phonePrefix"
            defaultValue={user.phonePrefix ?? ""}
            aria-label={t("phonePrefix")}
            className="focus:border-primary-500 focus:ring-primary-500 max-w-[35%] min-w-0 shrink-0 truncate rounded-md border border-gray-300 py-2 pr-8 pl-3 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-offset-0 focus:outline-none"
          >
            <option value="">{t("phonePrefix")}</option>
            {phonePrefixes.map((p) => (
              <option key={p.prefix} value={p.prefix}>
                {p.label} ({p.prefix})
              </option>
            ))}
          </select>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={user.phone ?? ""}
            className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 focus:outline-none"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="preferredLocale">{t("preferredLocale")}</Label>
        <select
          id="preferredLocale"
          name="preferredLocale"
          defaultValue={user.preferredLocale}
          className={selectClassName}
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <option key={locale.value} value={locale.value}>
              {locale.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="preferredCurrency">{t("preferredCurrency")}</Label>
        <select
          id="preferredCurrency"
          name="preferredCurrency"
          defaultValue={user.preferredCurrency}
          className={selectClassName}
        >
          {SUPPORTED_CURRENCIES.map((currency) => (
            <option key={currency.value} value={currency.value}>
              {currency.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="timezone">{t("timezone")}</Label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={
            user.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
          }
          className={selectClassName}
        >
          {Intl.supportedValuesOf("timeZone").map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="bio">{t("bio")}</Label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={user.bio ?? ""}
          placeholder={t("bioPlaceholder")}
          className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <Button type="submit" loading={pending}>
        {t("save")}
      </Button>
    </form>
  );
}
