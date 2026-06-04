"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { PasswordRequirements } from "@/presentation/components/molecules/PasswordRequirements";
import { Button } from "@/presentation/components/atoms/Button";
import { acceptInvitation } from "@/app/actions/invitation";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";

interface AcceptInvitationFormProps {
  token: string;
}

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const t = useTranslations("invitation");
  const translateError = useActionErrorMessage();
  const [state, formAction, pending] = useActionState(acceptInvitation, null);

  return (
    <>
      {state && !state.ok && (
        <AlertBanner variant="error" className="mb-4">
          {translateError(state)}
        </AlertBanner>
      )}
      <form action={formAction} className="space-y-4 text-left">
        <input type="hidden" name="token" value={token} />
        <FormField
          label={t("fullName")}
          name="fullName"
          required
          minLength={3}
          maxLength={255}
          autoComplete="name"
        />
        <FormField
          label={t("password")}
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
        />
        <PasswordRequirements />
        <Button
          type="submit"
          variant="primary"
          loading={pending}
          className="w-full cursor-pointer"
        >
          {t("accept")}
        </Button>
      </form>
    </>
  );
}
