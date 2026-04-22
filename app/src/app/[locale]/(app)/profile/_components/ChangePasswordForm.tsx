"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { PasswordRequirements } from "@/presentation/components/molecules/PasswordRequirements";
import { Button } from "@/presentation/components/atoms/Button";
import { changePassword } from "@/app/actions/auth";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";

export function ChangePasswordForm() {
  const t = useTranslations("profile");
  const translateError = useActionErrorMessage();
  const [state, formAction, pending] = useActionState(changePassword, null);
  const [dirty, setDirty] = useState(false);

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      className="space-y-4"
    >
      {state && !state.ok && (
        <AlertBanner variant="error">{translateError(state)}</AlertBanner>
      )}
      {state?.ok && (
        <AlertBanner variant="success">
          {t("passwordChangeSuccess")}
        </AlertBanner>
      )}
      <FormField
        label={t("currentPassword")}
        name="currentPassword"
        type="password"
        required
        autoComplete="current-password"
      />
      <FormField
        label={t("newPassword")}
        name="password"
        type="password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        autoComplete="new-password"
      />
      <FormField
        label={t("confirmPassword")}
        name="confirmPassword"
        type="password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        autoComplete="new-password"
      />
      <PasswordRequirements />
      <Button type="submit" loading={pending} disabled={!dirty}>
        {t("passwordChangeSubmit")}
      </Button>
    </form>
  );
}
