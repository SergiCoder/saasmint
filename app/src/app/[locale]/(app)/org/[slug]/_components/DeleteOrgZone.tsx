"use client";

import { useTranslations } from "next-intl";
import { DangerZone } from "@/presentation/components/organisms/DangerZone";
import { DeleteOrgDialog } from "./DeleteOrgDialog";

interface DeleteOrgZoneProps {
  orgId: string;
  orgName: string;
}

export function DeleteOrgZone({ orgId, orgName }: DeleteOrgZoneProps) {
  const t = useTranslations("org");

  return (
    <DangerZone
      triggerLabel={t("deleteOrg")}
      heading={t("deleteOrg")}
      description={t("deleteOrgDescription")}
    >
      <DeleteOrgDialog orgId={orgId} orgName={orgName} />
    </DangerZone>
  );
}
