"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { AuthErrorBanner } from "@/presentation/components/molecules/AuthErrorBanner";
import { Spinner } from "@/presentation/components/atoms/Spinner";
import { verifyEmail } from "@/app/actions/auth";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

interface VerifyEmailClientProps {
  token?: string;
}

export function VerifyEmailClient({ token }: VerifyEmailClientProps) {
  const t = useTranslations("auth.verifyEmail");
  const translateError = useActionErrorMessage();
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
        if (!result.ok) {
          setError(translateError(result));
          return;
        }
        if (result.data.pendingPlan) {
          const checkoutPath = result.data.isTeamPlan
            ? "/subscription/team-checkout"
            : "/subscription/checkout";
          router.push(
            `${checkoutPath}?plan=${encodeURIComponent(result.data.pendingPlan)}`,
          );
        } else {
          router.push("/dashboard");
        }
      })
      .catch(() => setError(t("error")));
  }, [token, router, t, translateError]);

  if (error) {
    return (
      <AuthErrorBanner message={error} backToLoginLabel={t("backToLogin")} />
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-gray-600">{t("verifying")}</p>
    </div>
  );
}
