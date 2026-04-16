"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { acceptInvitation } from "@/app/actions/invitation";

interface AcceptInvitationFormProps {
  token: string;
}

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const t = useTranslations("invitation");
  const [state, formAction, pending] = useActionState(acceptInvitation, null);

  return (
    <>
      {state?.error && (
        <AlertBanner variant="error" className="mb-4">
          {state.error}
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
          minLength={8}
          autoComplete="new-password"
        />
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
