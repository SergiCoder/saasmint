"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorView } from "@/presentation/components/organisms/ErrorView";
import { Button } from "@/presentation/components/atoms/Button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MarketingError({ error, reset }: ErrorPageProps) {
  const t = useTranslations("errorPage");

  useEffect(() => {
    console.error("[marketing] route error:", error);
  }, [error]);

  return (
    <ErrorView
      title={t("title")}
      description={t("description")}
      homeLabel={t("home")}
      homeHref="/"
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
