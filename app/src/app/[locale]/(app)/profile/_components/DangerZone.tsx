"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

interface DangerZoneProps {
  userEmail: string;
  deleteRestriction?: "owner" | "member";
}

export function DangerZone({ userEmail, deleteRestriction }: DangerZoneProps) {
  const t = useTranslations("profile");
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="cursor-pointer text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
      >
        {t("deleteAccount")}
      </button>
    );
  }

  return (
    <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-red-600">{t("danger")}</h2>
      {deleteRestriction ? (
        <p className="text-sm text-gray-600">
          {deleteRestriction === "owner"
            ? t("deleteBlockedOwner")
            : t("deleteBlockedMember")}
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-600">{t("deleteConfirm")}</p>
          <div className="mt-4">
            <DeleteAccountDialog userEmail={userEmail} />
          </div>
        </>
      )}
    </section>
  );
}
