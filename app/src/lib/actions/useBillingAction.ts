"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import type { ActionResult } from "@/lib/actions/ActionResult";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

interface UseBillingActionResult<TArgs extends unknown[]> {
  execute: (...args: TArgs) => void;
  isPending: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Wraps the "fire a server action, refresh the route on success, surface a
 * translated error on failure" pattern shared by every billing-mutation
 * button (Cancel renewal, Change plan, Resume, Release scheduled change).
 *
 * Server actions call `revalidatePath`, but a Server Component re-render only
 * happens once the client triggers it — without `router.refresh()` the card
 * keeps showing pre-mutation data until the user reloads manually.
 *
 * `onSuccess` runs synchronously after `router.refresh()` so callers can
 * close dialogs (`confirmRef.current?.close()`) without re-implementing the
 * transition/error wiring.
 */
export function useBillingAction<TArgs extends unknown[]>(
  action: (...args: TArgs) => Promise<ActionResult>,
  onSuccess?: () => void,
): UseBillingActionResult<TArgs> {
  const router = useRouter();
  const translateError = useActionErrorMessage();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const execute = (...args: TArgs) => {
    setError(null);
    startTransition(async () => {
      const result = await action(...args);
      if (result.ok) {
        onSuccess?.();
        router.refresh();
      } else {
        setError(translateError(result));
      }
    });
  };

  return {
    execute,
    isPending,
    error,
    clearError: () => setError(null),
  };
}
