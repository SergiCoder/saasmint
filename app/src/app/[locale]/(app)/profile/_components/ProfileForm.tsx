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
import { LOCALES } from "@/lib/i18n/locales";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";
import { useResendVerification } from "@/lib/actions/useResendVerification";
import type { User } from "@/domain/models/User";
import { PHONE_PREFIXES } from "@/domain/data/phonePrefixes";

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
  timezones: readonly string[];
}

export function ProfileForm({ user, timezones }: ProfileFormProps) {
  const t = useTranslations("profile");
  const translateError = useActionErrorMessage();
  const [state, formAction, pending] = useActionState(updateProfile, null);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [phonePrefix, setPhonePrefix] = useState(user.phonePrefix || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [lastActionState, setLastActionState] = useState(state);
  const {
    pending: resendPending,
    status: resendStatus,
    errorMessage: resendError,
    submit: submitResend,
  } = useResendVerification();

  if (state !== lastActionState) {
    setLastActionState(state);
    if (state?.ok) {
      setDirty(false);
      setFormKey((k) => k + 1);
    }
  }

  const saved = state?.ok === true;
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  async function handleAvatarChange(file: File | null) {
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      if (file) {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("avatar", compressed, "avatar.webp");
        const result = await uploadAvatar(formData);
        if (!result.ok) {
          setAvatarError(translateError(result));
          return;
        }
        await updateAvatarUrl(result.data.avatarUrl);
        setAvatarUrl(result.data.avatarUrl);
      } else {
        const result = await deleteAvatar();
        if (!result.ok) {
          setAvatarError(translateError(result));
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
      {state && !state.ok && !state.fieldErrors && (
        <AlertBanner variant="error">{translateError(state)}</AlertBanner>
      )}
      {saved && <AlertBanner variant="success">{t("saved")}</AlertBanner>}

      {!user.isVerified && resendStatus !== "sent" && (
        <AlertBanner variant="warning">
          <span className="mr-2">{t("emailNotVerified")}</span>
          <button
            type="button"
            onClick={() => submitResend(user.email)}
            disabled={resendPending}
            className="text-primary-700 hover:text-primary-800 font-medium underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("resendVerification")}
          </button>
        </AlertBanner>
      )}
      {resendStatus === "sent" && (
        <AlertBanner variant="success">
          {t("verificationEmailSent")}
        </AlertBanner>
      )}
      {resendStatus === "error" && resendError && (
        <AlertBanner variant="error">{resendError}</AlertBanner>
      )}

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
              {PHONE_PREFIXES.map((p) => (
                <option key={p.prefix} value={p.prefix}>
                  {p.label} ({p.prefix})
                </option>
              ))}
            </select>
            {fieldErrors?.phone === "phonePrefixRequired" && (
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
            {(fieldErrors?.phone === "phoneNumberRequired" ||
              fieldErrors?.phone === "phoneTooShort") && (
              <p className="mt-1 text-sm text-red-600">
                {t(fieldErrors.phone)}
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
            {LOCALES.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
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
