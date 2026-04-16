"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { inviteMember } from "@/app/actions/org";

interface InviteByEmailFormProps {
  orgId: string;
}

export function InviteByEmailForm({ orgId }: InviteByEmailFormProps) {
  const t = useTranslations("org");
  const [state, formAction, pending] = useActionState(inviteMember, null);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && (
        <AlertBanner variant="error">{state.error}</AlertBanner>
      )}
      {state?.ok && (
        <AlertBanner variant="success">{t("invitationSent")}</AlertBanner>
      )}
      <input type="hidden" name="orgId" value={orgId} />
      <FormField label={t("email")} name="email" type="email" required />
      <div className="space-y-1">
        <label
          htmlFor="role"
          className="block text-sm font-medium text-gray-700"
        >
          {t("role")}
        </label>
        <select
          id="role"
          name="role"
          defaultValue="member"
          className="focus:border-primary-500 focus:ring-primary-500 block w-full cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-offset-0 focus:outline-none"
        >
          <option value="member">{t("roleMember")}</option>
          <option value="admin">{t("roleAdmin")}</option>
        </select>
      </div>
      <Button type="submit" loading={pending}>
        {t("inviteMember")}
      </Button>
    </form>
  );
}
