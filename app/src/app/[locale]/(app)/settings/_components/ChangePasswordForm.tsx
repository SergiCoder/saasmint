"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { updatePassword } from "@/app/actions/auth";

export function ChangePasswordForm() {
  const t = useTranslations("settings");
  const [state, formAction, pending] = useActionState(updatePassword, null);
  const [dirty, setDirty] = useState(false);

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      className="space-y-4"
    >
      {state?.error && <AlertBanner variant="error">{state.error}</AlertBanner>}
      {state && "success" in state && (
        <AlertBanner variant="success">
          {t("passwordChangeSuccess")}
        </AlertBanner>
      )}
      <FormField
        label={t("newPassword")}
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      <FormField
        label={t("confirmPassword")}
        name="confirmPassword"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      <Button type="submit" loading={pending} disabled={!dirty}>
        {t("passwordChangeSubmit")}
      </Button>
    </form>
  );
}
