"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { exchangeOAuthCode } from "@/app/actions/auth";
import { Spinner } from "@/presentation/components/atoms/Spinner";

interface AuthCallbackClientProps {
  completingLabel: string;
  noscriptLabel: string;
  backToLoginLabel: string;
}

/**
 * No third-party script (Sentry, analytics, RUM, session replay) may mount on
 * this route without first scrubbing `#code=` from URLs — the opaque code is
 * single-use and short-lived but still sensitive until exchanged.
 */
export function AuthCallbackClient({
  completingLabel,
  noscriptLabel,
  backToLoginLabel,
}: AuthCallbackClientProps) {
  const router = useRouter();
  const ranRef = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const hash = window.location.hash;
    const params = new URLSearchParams(
      hash.startsWith("#") ? hash.slice(1) : hash,
    );
    const code = params.get("code");
    const providerError = params.get("error");

    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );

    if (providerError || !code) {
      router.replace("/login?error=oauth_error");
      return;
    }

    exchangeOAuthCode(code)
      .then((result) => {
        if (result.ok) {
          router.replace(result.next);
        } else if (result.error === "oauth_no_flow") {
          router.replace("/login?error=oauth_no_flow");
        } else {
          router.replace("/login?error=oauth_error");
        }
      })
      .catch(() => {
        setFailed(true);
      });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        {failed ? (
          <>
            <p className="text-sm text-gray-700">{noscriptLabel}</p>
            <Link
              href="/login"
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              {backToLoginLabel}
            </Link>
          </>
        ) : (
          <>
            <Spinner size="lg" className="text-primary-600" />
            <p className="text-sm text-gray-600">{completingLabel}</p>
          </>
        )}
      </div>
      <noscript>
        <p>{noscriptLabel}</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- <noscript> requires raw <a>; <Link> needs hydration */}
        <a href="/login">{backToLoginLabel}</a>
      </noscript>
    </div>
  );
}
