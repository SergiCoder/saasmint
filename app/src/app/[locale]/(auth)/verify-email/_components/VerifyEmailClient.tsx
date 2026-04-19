"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
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
  // Django consumes the verification token on first hit. React 19 StrictMode
  // replays effects in dev, so without this guard we'd send the same token
  // twice and the second call would always fail with "already used."
  const firedRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (firedRef.current) return;
    firedRef.current = true;

    verifyEmail(token)
      .then((result) => {
        if (result?.error) {
          setError(result.error);
        } else if (result?.pendingPlan) {
          const checkoutPath = result.isTeamPlan
            ? "/subscription/team-checkout"
            : "/subscription/checkout";
          router.push(
            `${checkoutPath}?plan=${encodeURIComponent(result.pendingPlan)}`,
          );
        } else {
          router.push("/dashboard");
        }
      })
      .catch(() => setError(t("error")));
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
