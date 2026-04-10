"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Spinner } from "@/presentation/components/atoms/Spinner";
import { verifyEmail } from "@/app/actions/auth";

interface VerifyEmailClientProps {
  token?: string;
}

export function VerifyEmailClient({ token }: VerifyEmailClientProps) {
  const t = useTranslations("auth.verifyEmail");
  const router = useRouter();
  const [error, setError] = useState<string | null>(token ? null : t("error"));

  useEffect(() => {
    if (!token) return;

    let ignore = false;

    verifyEmail(token)
      .then((result) => {
        if (ignore) return;
        if (result?.error) {
          setError(result.error);
        } else {
          router.push("/dashboard");
        }
      })
      .catch(() => {
        if (!ignore) setError(t("error"));
      });

    return () => {
      ignore = true;
    };
  }, [token, router, t]);

  if (error) {
    return (
      <>
        <AlertBanner variant="error" className="mb-4">
          {error}
        </AlertBanner>
        <p className="text-center text-sm text-gray-600">
          <Link
            href="/login"
            className="text-primary-600 hover:text-primary-500 font-medium"
          >
            {t("backToLogin")}
          </Link>
        </p>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-gray-600">{t("verifying")}</p>
    </div>
  );
}
