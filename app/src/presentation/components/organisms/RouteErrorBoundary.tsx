"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorView } from "./ErrorView";
import { Button } from "@/presentation/components/atoms/Button";

export interface RouteErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref: string;
  /** Log prefix for console.error (e.g. "app", "marketing"). */
  tag: string;
}

export function RouteErrorBoundary({
  error,
  reset,
  homeHref,
  tag,
}: RouteErrorBoundaryProps) {
  const t = useTranslations("errorPage");

  useEffect(() => {
    console.error(`[${tag}] route error:`, error);
  }, [error, tag]);

  return (
    <ErrorView
      title={t("title")}
      description={t("description")}
      homeLabel={t("home")}
      homeHref={homeHref}
      errorIdLabel={t("errorId")}
      errorId={error.digest}
      retrySlot={
        <Button variant="primary" onClick={reset}>
          {t("retry")}
        </Button>
      }
    />
  );
}
