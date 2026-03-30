"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { inviteMember } from "@/app/actions/org";

interface InviteMemberFormProps {
  orgId: string;
}

export function InviteMemberForm({ orgId }: InviteMemberFormProps) {
  const t = useTranslations("org");
  const [state, formAction, pending] = useActionState(inviteMember, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <AlertBanner variant="error">{state.error}</AlertBanner>}
      {state?.success && (
        <AlertBanner variant="success">{t("invite")}</AlertBanner>
      )}
      <input type="hidden" name="orgId" value={orgId} />
      <FormField label="Email" name="email" type="email" required />
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
          className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-offset-0 focus:outline-none"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
      </div>
      <Button type="submit" loading={pending}>
        {t("invite")}
      </Button>
    </form>
  );
}
