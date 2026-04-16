"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function OrgDangerZone() {
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
    <section className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-red-900">
        {t("dangerZone")}
      </h2>
      <p className="text-sm text-red-700">
        {t("deleteOrgBlockedSubscription")}
      </p>
    </section>
  );
}
