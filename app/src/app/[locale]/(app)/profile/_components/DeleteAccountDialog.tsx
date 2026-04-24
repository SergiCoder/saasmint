"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { deleteAccount } from "@/app/actions/user";
import { TypeToConfirmDialog } from "@/presentation/components/molecules/TypeToConfirmDialog";

interface DeleteAccountDialogProps {
  userEmail: string;
}

export function DeleteAccountDialog({ userEmail }: DeleteAccountDialogProps) {
  const t = useTranslations("profile");
  const router = useRouter();

  return (
    <TypeToConfirmDialog
      triggerLabel={t("deleteAccount")}
      title={t("deleteDialogTitle")}
      description={t("deleteDialogDescription")}
      inputLabel={t("deleteDialogLabel")}
      inputPlaceholder={t("deleteDialogPlaceholder")}
      inputType="email"
      expectedValue={userEmail}
      mismatchError={t("deleteDialogMismatch")}
      cancelLabel={t("deleteDialogCancel")}
      submitLabel={t("deleteDialogSubmit")}
      onConfirm={async () => {
        const result = await deleteAccount();
        if (!result.ok) return t("deleteDialogError");
        router.replace("/login?deleted=true");
        return null;
      }}
    />
  );
}
