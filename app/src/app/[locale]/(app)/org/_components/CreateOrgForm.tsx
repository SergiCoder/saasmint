"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { createOrg } from "@/app/actions/org";

export function CreateOrgForm() {
  const t = useTranslations("org");
  const tCommon = useTranslations("common");
  const [state, formAction, pending] = useActionState(createOrg, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <AlertBanner variant="error">{state.error}</AlertBanner>}
      <FormField label={t("title")} name="name" required />
      <FormField label="Slug" name="slug" required />
      <Button type="submit" loading={pending}>
        {t("create")}
      </Button>
      {pending && <p className="text-sm text-gray-500">{tCommon("loading")}</p>}
    </form>
  );
}
