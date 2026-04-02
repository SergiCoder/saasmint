"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { Label } from "@/presentation/components/atoms/Label";

const CUSTOM_PRONOUNS_VALUE = "__custom__";
const PRONOUN_KEYS = [
  "pronounsHeHim",
  "pronounsSheHer",
  "pronounsTheyThem",
] as const;

interface AuthFormProps {
  action: (prev: unknown, fd: FormData) => Promise<{ error: string } | void>;
  translationNamespace: string;
  passwordAutoComplete: string;
  showNameField?: boolean;
  showPronouns?: boolean;
  footerLink: { href: string; textKey: string; linkKey: string };
  serverAlerts?: React.ReactNode;
}

export function AuthForm({
  action,
  translationNamespace,
  passwordAutoComplete,
  showNameField = false,
  showPronouns = false,
  footerLink,
  serverAlerts,
}: AuthFormProps) {
  const t = useTranslations(translationNamespace);
  const [state, formAction, pending] = useActionState(action, null);
  const [pronounsSelect, setPronounsSelect] = useState("");
  const [customPronouns, setCustomPronouns] = useState("");

  const pronounOptions = showPronouns ? PRONOUN_KEYS.map((key) => t(key)) : [];

  return (
    <>
      {state?.error ? (
        <AlertBanner variant="error" className="mb-4">
          {state.error}
        </AlertBanner>
      ) : (
        serverAlerts
      )}
      <form action={formAction} className="space-y-4">
        {showNameField && (
          <FormField
            label={t("fullName")}
            name="fullName"
            required
            minLength={3}
            maxLength={255}
            autoComplete="name"
          />
        )}
        {showPronouns && (
          <div className="space-y-1">
            <Label htmlFor="pronouns">{t("pronouns")}</Label>
            <select
              id="pronouns"
              name={
                pronounsSelect === CUSTOM_PRONOUNS_VALUE
                  ? undefined
                  : "pronouns"
              }
              value={pronounsSelect}
              onChange={(e) => setPronounsSelect(e.target.value)}
              className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-offset-0 focus:outline-none"
            >
              <option value="">{t("pronounsDontSpecify")}</option>
              {pronounOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value={CUSTOM_PRONOUNS_VALUE}>
                {t("pronounsCustom")}
              </option>
            </select>
            {pronounsSelect === CUSTOM_PRONOUNS_VALUE && (
              <input
                name="pronouns"
                type="text"
                maxLength={50}
                value={customPronouns}
                onChange={(e) => setCustomPronouns(e.target.value)}
                placeholder={t("pronounsCustomPlaceholder")}
                className="focus:border-primary-500 focus:ring-primary-500 mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 focus:outline-none"
              />
            )}
          </div>
        )}
        <FormField
          label={t("email")}
          name="email"
          type="email"
          required
          autoComplete="email"
        />
        <FormField
          label={t("password")}
          name="password"
          type="password"
          required
          autoComplete={passwordAutoComplete}
        />
        <Button type="submit" loading={pending} className="w-full">
          {t("submit")}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        {t(footerLink.textKey)}{" "}
        <Link
          href={footerLink.href}
          className="text-primary-600 hover:text-primary-500 font-medium"
        >
          {t(footerLink.linkKey)}
        </Link>
      </p>
    </>
  );
}
