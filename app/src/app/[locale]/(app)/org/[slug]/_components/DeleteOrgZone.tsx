"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DeleteOrgDialog } from "./DeleteOrgDialog";

interface DeleteOrgZoneProps {
  orgId: string;
  orgName: string;
}

export function DeleteOrgZone({ orgId, orgName }: DeleteOrgZoneProps) {
  const t = useTranslations("org");
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="cursor-pointer text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
      >
        {t("deleteOrg")}
      </button>
    );
  }

  return (
    <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-red-600">
        {t("deleteOrg")}
      </h2>
      <p className="mb-4 text-sm text-gray-600">{t("deleteOrgDescription")}</p>
      <DeleteOrgDialog orgId={orgId} orgName={orgName} />
    </section>
  );
}
