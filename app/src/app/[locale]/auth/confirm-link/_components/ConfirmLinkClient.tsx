"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { AuthErrorBanner } from "@/presentation/components/molecules/AuthErrorBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { confirmOAuthLink } from "@/app/actions/auth";

interface ConfirmLinkClientProps {
  token?: string;
}

const ERROR_CODE_TO_KEY: Readonly<Record<string, string>> = {
  token_used: "used",
  token_expired: "expired",
  invalid_token: "invalid",
  user_not_found: "inactive",
  social_account_collision: "collision",
};

/**
 * Posts the email-issued single-use link token to /auth/oauth/confirm-link/.
 *
 * Critically does NOT auto-POST on mount: email-scanning bots (Outlook Safe
 * Links, Proofpoint, etc.) pre-fetch URLs and would consume the single-use
 * token before the human ever clicks. The user must click the button.
 */
export function ConfirmLinkClient({ token }: ConfirmLinkClientProps) {
  const t = useTranslations("auth.confirmLink");
  const router = useRouter();
  const firedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : t("error.invalid"),
  );

  async function handleConfirm() {
    if (!token) {
      setError(t("error.invalid"));
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const result = await confirmOAuthLink(token);
      if (result.ok) {
        router.replace("/dashboard");
        return;
      }

      const key = ERROR_CODE_TO_KEY[result.code];
      setError(key ? t(`error.${key}`) : t("error.generic"));
    } catch {
      setError(t("error.generic"));
    } finally {
      firedRef.current = false;
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <AuthErrorBanner message={error} backToLoginLabel={t("backToLogin")} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-center text-sm text-gray-600">{t("body")}</p>
      <Button
        type="button"
        onClick={handleConfirm}
        loading={submitting}
        disabled={submitting}
        className="w-full"
      >
        {submitting ? t("verifying") : t("button")}
      </Button>
    </div>
  );
}
