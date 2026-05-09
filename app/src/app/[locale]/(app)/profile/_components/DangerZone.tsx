"use client";

import { useTranslations } from "next-intl";
import { DangerZone as DangerZoneShell } from "@/presentation/components/organisms/DangerZone";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

interface DangerZoneProps {
  userEmail: string;
  /**
   * When true, the user can't delete their account because they own an org.
   * The expanded section explains why instead of rendering the delete dialog.
   */
  deleteRestricted?: boolean;
}

export function DangerZone({ userEmail, deleteRestricted }: DangerZoneProps) {
  const t = useTranslations("profile");

  return (
    <DangerZoneShell
      triggerLabel={t("deleteAccount")}
      heading={t("danger")}
      {...(deleteRestricted ? { description: t("deleteBlockedOwner") } : {})}
    >
      {!deleteRestricted && (
        <>
          <p className="text-sm text-gray-600">{t("deleteConfirm")}</p>
          <div className="mt-4">
            <DeleteAccountDialog userEmail={userEmail} />
          </div>
        </>
      )}
    </DangerZoneShell>
  );
}
