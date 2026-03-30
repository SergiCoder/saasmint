"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { updateProfile } from "@/app/actions/user";
import type { User } from "@/domain/models/User";

interface SettingsFormProps {
  user: User;
}

export function SettingsForm({ user }: SettingsFormProps) {
  const t = useTranslations("settings");
  const [state, formAction, pending] = useActionState(updateProfile, null);

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
      <Button type="submit" loading={pending}>
        {t("save")}
      </Button>
    </form>
  );
}
