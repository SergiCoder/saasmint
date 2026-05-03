"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/presentation/components/atoms/Button";
import { releaseScheduledChange } from "@/app/actions/billing";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

interface ReleaseScheduledChangeButtonProps {
  children: React.ReactNode;
  context?: SubscriptionContext;
}

export function ReleaseScheduledChangeButton({
  children,
  context,
}: ReleaseScheduledChangeButtonProps) {
  const router = useRouter();
  const translateError = useActionErrorMessage();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await releaseScheduledChange(context);
      if (result.ok) {
        router.refresh();
      } else {
        setError(translateError(result));
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="primary"
        onClick={handleClick}
        loading={isPending}
      >
        {children}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
