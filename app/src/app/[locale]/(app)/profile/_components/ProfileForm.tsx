"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { PronounsPicker } from "@/presentation/components/molecules/PronounsPicker";
import { AvatarUpload } from "@/presentation/components/atoms/AvatarUpload";
import { Button } from "@/presentation/components/atoms/Button";
import { Label } from "@/presentation/components/atoms/Label";
import { uploadAvatar, deleteAvatar } from "@/app/actions/avatar";
import { compressImage } from "@/lib/compressImage";
import { updateProfile, updateAvatarUrl } from "@/app/actions/user";
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

interface ProfileFormProps {
  user: User;
  phonePrefixes: PhonePrefix[];
  timezones: readonly string[];
}

export function ProfileForm({
  user,
  phonePrefixes,
  timezones,
}: ProfileFormProps) {
  const t = useTranslations("profile");
  const [state, formAction, pending] = useActionState(updateProfile, null);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [phonePrefix, setPhonePrefix] = useState(user.phonePrefix || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [lastActionState, setLastActionState] = useState(state);

  if (state !== lastActionState) {
    setLastActionState(state);
    if (state?.success) {
      setDirty(false);
      setFormKey((k) => k + 1);
    }
  }

  const saved = state?.success === true;

  async function handleAvatarChange(file: File | null) {
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      if (file) {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("avatar", compressed, "avatar.webp");
        const result = await uploadAvatar(formData);
        if (result.error || !result.avatarUrl) {
          setAvatarError(result.error ?? "Upload failed.");
          return;
        }
        await updateAvatarUrl(result.avatarUrl);
        setAvatarUrl(result.avatarUrl);
      } else {
        const result = await deleteAvatar();
        if (result.error) {
          setAvatarError(result.error);
          return;
        }
        await updateAvatarUrl(null);
        setAvatarUrl(null);
      }
    } catch {
      setAvatarError(t("avatarError"));
    } finally {
      setAvatarUploading(false);
    }
  }

  const selectClassName =
    "block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form
      key={formKey}
      action={formAction}
      onChange={(e) => {
        if ((e.target as HTMLElement).closest("[data-auto-save]")) return;
        setDirty(true);
      }}
      className="space-y-6"
    >
      {state?.error && !state.fieldErrors && (
        <AlertBanner variant="error">{state.error}</AlertBanner>
      )}
      {saved && <AlertBanner variant="success">{t("saved")}</AlertBanner>}

      <AvatarUpload
        currentSrc={avatarUrl}
        userName={user.fullName ?? user.email}
        uploadLabel={t("avatarUpload")}
        removeLabel={t("avatarRemove")}
        loading={avatarUploading}
        onChange={handleAvatarChange}
      />
      {avatarError && <AlertBanner variant="error">{avatarError}</AlertBanner>}

      <FormField
        label={t("email")}
        name="email"
        type="email"
        defaultValue={user.email}
        disabled
      />
      <FormField
        label={t("fullName")}
        name="fullName"
        required
        minLength={3}
        maxLength={255}
        defaultValue={user.fullName ?? ""}
      />
      <FormField
        label={t("jobTitle")}
        name="jobTitle"
        defaultValue={user.jobTitle ?? ""}
      />
      <PronounsPicker
        t={t}
        defaultValue={user.pronouns}
        onDirty={() => setDirty(true)}
        selectClassName={selectClassName}
      />
      <div className="space-y-1">
        <Label htmlFor="phone">{t("phone")}</Label>
        <div className="flex gap-2">
          <div className="max-w-[35%] shrink-0">
            <select
              id="phonePrefix"
              name="phonePrefix"
              value={phonePrefix}
              onChange={(e) => setPhonePrefix(e.target.value)}
              aria-label={t("phonePrefix")}
              className="focus:border-primary-500 focus:ring-primary-500 w-full min-w-0 truncate rounded-md border border-gray-300 py-2 pr-8 pl-3 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-offset-0 focus:outline-none"
            >
              <option value="">{t("phonePrefix")}</option>
              {phonePrefixes.map((p) => (
                <option key={p.prefix} value={p.prefix}>
                  {p.label} ({p.prefix})
                </option>
              ))}
            </select>
            {state?.fieldErrors?.phone === "phonePrefixRequired" && (
              <p className="mt-1 text-sm text-red-600">
                {t("phonePrefixRequired")}
              </p>
            )}
          </div>
          <div className="w-full">
            <input
              id="phone"
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 focus:outline-none"
            />
            {(state?.fieldErrors?.phone === "phoneNumberRequired" ||
              state?.fieldErrors?.phone === "phoneTooShort") && (
              <p className="mt-1 text-sm text-red-600">
                {t(state.fieldErrors.phone)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
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
      <Button type="submit" loading={pending} disabled={!dirty}>
        {t("save")}
      </Button>
    </form>
  );
}
