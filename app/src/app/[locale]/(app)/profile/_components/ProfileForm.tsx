"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { PronounsPicker } from "@/presentation/components/molecules/PronounsPicker";
import { AvatarUpload } from "@/presentation/components/atoms/AvatarUpload";
import { Button } from "@/presentation/components/atoms/Button";
import { INPUT_DEFAULT_CLASS } from "@/presentation/components/atoms/Input";
import { Label } from "@/presentation/components/atoms/Label";
import { uploadAvatar, deleteAvatar } from "@/app/actions/avatar";
import { compressImage } from "@/lib/compressImage";
import { updateProfile, updateAvatarUrl } from "@/app/actions/user";
import { LOCALES } from "@/lib/i18n/locales";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";
import { useResendVerification } from "@/lib/actions/useResendVerification";
import { SUPPORTED_CURRENCY_CODES } from "@/lib/supportedCurrencies";
import type { User } from "@/domain/models/User";
import type { PhonePrefix } from "@/domain/models/PhonePrefix";

const CURRENCY_LABELS: Record<
  (typeof SUPPORTED_CURRENCY_CODES)[number],
  string
> = {
  usd: "USD — US Dollar",
  eur: "EUR — Euro",
  gbp: "GBP — British Pound",
  cad: "CAD — Canadian Dollar",
  aud: "AUD — Australian Dollar",
  chf: "CHF — Swiss Franc",
  jpy: "JPY — Japanese Yen",
  cny: "CNY — Chinese Yuan",
  twd: "TWD — New Taiwan Dollar",
  krw: "KRW — South Korean Won",
  brl: "BRL — Brazilian Real",
  sek: "SEK — Swedish Krona",
  nok: "NOK — Norwegian Krone",
  dkk: "DKK — Danish Krone",
  pln: "PLN — Polish Złoty",
  try: "TRY — Turkish Lira",
  idr: "IDR — Indonesian Rupiah",
  rub: "RUB — Russian Ruble",
  sar: "SAR — Saudi Riyal",
  aed: "AED — UAE Dirham",
};

const SUPPORTED_CURRENCIES = SUPPORTED_CURRENCY_CODES.map((value) => ({
  value,
  label: CURRENCY_LABELS[value],
}));

interface ProfileFormProps {
  user: User;
  /**
   * Phone-prefix options. Passed from the server page so the ~8 KB
   * `PHONE_PREFIXES` table doesn't ship in the client bundle.
   */
  phonePrefixes: readonly PhonePrefix[];
}

export function ProfileForm({ user, phonePrefixes }: ProfileFormProps) {
  // Lazy-initialise the timezone list on first render so the ~10 KB IANA
  // string array stays out of the RSC payload (the server would otherwise
  // serialise it on every profile-page hit, even when the picker never
  // opens). `Intl.supportedValuesOf` is available in all the browsers we
  // support, so the client can compute it just-in-time.
  const [timezones] = useState<readonly string[]>(() =>
    Intl.supportedValuesOf("timeZone"),
  );
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

  return (
    <form
      key={formKey}
      action={formAction}
      onChange={(e) => {
        if (!(e.target instanceof HTMLElement)) return;
        if (e.target.closest("[data-auto-save]")) return;
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
        maxLength={255}
        defaultValue={user.jobTitle ?? ""}
      />
      <PronounsPicker
        t={t}
        defaultValue={user.pronouns}
        onDirty={() => setDirty(true)}
        selectClassName={INPUT_DEFAULT_CLASS}
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
              className={`${INPUT_DEFAULT_CLASS} min-w-0 truncate pr-8 pl-3`}
            >
              <option value="">{t("phonePrefix")}</option>
              {phonePrefixes.map((p) => (
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
              className={INPUT_DEFAULT_CLASS}
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
            className={INPUT_DEFAULT_CLASS}
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
            className={INPUT_DEFAULT_CLASS}
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
            className={INPUT_DEFAULT_CLASS}
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
          maxLength={500}
          defaultValue={user.bio ?? ""}
          placeholder={t("bioPlaceholder")}
          className={INPUT_DEFAULT_CLASS}
        />
      </div>
      <Button type="submit" loading={pending} disabled={!dirty}>
        {t("save")}
      </Button>
    </form>
  );
}
