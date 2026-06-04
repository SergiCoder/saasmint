"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { deleteOrg } from "@/app/actions/org";
import { TypeToConfirmDialog } from "@/presentation/components/molecules/TypeToConfirmDialog";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

interface DeleteOrgDialogProps {
  orgId: string;
  orgName: string;
}

export function DeleteOrgDialog({ orgId, orgName }: DeleteOrgDialogProps) {
  const t = useTranslations("org");
  const translateError = useActionErrorMessage();
  const router = useRouter();

  return (
    <TypeToConfirmDialog
      triggerLabel={t("deleteOrg")}
      title={t("deleteOrgDialogTitle")}
      description={t("deleteOrgDialogDescription")}
      inputLabel={t("deleteOrgDialogLabel", { name: orgName })}
      inputPlaceholder={orgName}
      expectedValue={orgName}
      mismatchError={t("deleteOrgDialogMismatch")}
      cancelLabel={t("deleteOrgDialogCancel")}
      submitLabel={t("deleteOrgDialogSubmit")}
      onConfirm={async () => {
        const formData = new FormData();
        formData.set("orgId", orgId);
        const result = await deleteOrg(null, formData);
        if (!result.ok) return translateError(result);
        router.replace("/dashboard");
        return null;
      }}
    />
  );
}
