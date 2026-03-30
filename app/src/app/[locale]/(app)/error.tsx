"use client";

import { useTranslations } from "next-intl";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ reset }: ErrorPageProps) {
  const t = useTranslations("common");

  return (
    <div className="mx-auto max-w-md py-16">
      <AlertBanner variant="error">
        <p>{t("error")}</p>
      </AlertBanner>
      <div className="mt-4 text-center">
        <Button variant="secondary" onClick={reset}>
          {t("confirm")}
        </Button>
      </div>
    </div>
  );
}
