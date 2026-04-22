"use client";

import { useMessages, useTranslations } from "next-intl";
import type { ActionErr } from "./ActionResult";

/**
 * Hook that returns a function for translating an {@link ActionErr} into a
 * user-facing string. Prefers the action's `message` override (server-provided
 * detail) if set, then the `actionErrors.<code>` translation, then the
 * translated `unknown_error` fallback.
 */
export function useActionErrorMessage(): (err: ActionErr) => string {
  const t = useTranslations("actionErrors");
  const messages = useMessages() as { actionErrors?: Record<string, unknown> };
  const known = messages.actionErrors ?? {};
  return (err) => {
    if (err.message) return err.message;
    return err.code in known ? t(err.code) : t("unknown_error");
  };
}
