"use client";

import { useState, useTransition } from "react";
import { Button } from "@/presentation/components/atoms/Button";
import { resumeSubscription } from "@/app/actions/billing";

interface ResumeSubscriptionButtonProps {
  children: React.ReactNode;
}

export function ResumeSubscriptionButton({
  children,
}: ResumeSubscriptionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await resumeSubscription();
        if (!result.ok) {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
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
