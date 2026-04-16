"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorView } from "@/presentation/components/organisms/ErrorView";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PublicError({ error, reset }: ErrorPageProps) {
  const t = useTranslations("errorPage");

  useEffect(() => {
    console.error("[public] route error:", error);
  }, [error]);

  return (
    <ErrorView
      title={t("title")}
      description={t("description")}
      retryLabel={t("retry")}
      homeLabel={t("home")}
      homeHref="/"
      errorIdLabel={t("errorId")}
      errorId={error.digest}
      onRetry={reset}
    />
  );
}
