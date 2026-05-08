"use client";

import { useMessages, useTranslations } from "next-intl";
import { isRecord } from "@/lib/typeGuards";
import type { ActionErr } from "./ActionResult";

/**
 * Hook that returns a function for translating an {@link ActionErr} into a
 * user-facing string via the `actionErrors.<code>` next-intl namespace,
 * falling back to the translated `unknown_error` when the code is unknown.
 */
export function useActionErrorMessage(): (err: ActionErr) => string {
  const t = useTranslations("actionErrors");
  const messages = useMessages();
  const actionErrors = isRecord(messages.actionErrors)
    ? messages.actionErrors
    : {};
  return (err) => (err.code in actionErrors ? t(err.code) : t("unknown_error"));
}
