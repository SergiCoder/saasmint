"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/presentation/components/atoms/Button";
import { Divider } from "@/presentation/components/atoms/Divider";
import { GoogleIcon } from "@/presentation/components/atoms/GoogleIcon";
import { GitHubIcon } from "@/presentation/components/atoms/GitHubIcon";
import { MicrosoftIcon } from "@/presentation/components/atoms/MicrosoftIcon";

type OAuthProvider = "google" | "github" | "microsoft";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const providers = [
  {
    id: "google" as OAuthProvider,
    icon: GoogleIcon,
    labelKey: "continueWithGoogle",
  },
  {
    id: "github" as OAuthProvider,
    icon: GitHubIcon,
    labelKey: "continueWithGitHub",
  },
  {
    id: "microsoft" as OAuthProvider,
    icon: MicrosoftIcon,
    labelKey: "continueWithMicrosoft",
  },
] as const;

interface OAuthButtonsProps {
  plan?: string;
}

export function OAuthButtons({ plan }: OAuthButtonsProps = {}) {
  const t = useTranslations("auth.oauth");
  const locale = useLocale();
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(
    null,
  );

  function handleOAuth(provider: OAuthProvider) {
    setLoadingProvider(provider);
    const callbackUrl = new URL(
      `${window.location.origin}/${locale}/auth/callback`,
    );
    if (plan) {
      callbackUrl.searchParams.set(
        "next",
        `/subscription/checkout?plan=${encodeURIComponent(plan)}`,
      );
    }

    const oauthUrl = new URL(`${API_URL}/api/v1/auth/oauth/${provider}/`);
    oauthUrl.searchParams.set("redirect_uri", callbackUrl.toString());

    window.location.assign(oauthUrl.toString());
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-3">
        {providers.map(({ id, icon: Icon, labelKey }) => (
          <Button
            key={id}
            variant="secondary"
            className="w-full cursor-pointer"
            loading={loadingProvider === id}
            disabled={loadingProvider !== null}
            onClick={() => handleOAuth(id)}
          >
            <Icon className="mr-2 h-5 w-5" />
            {t(labelKey)}
          </Button>
        ))}
      </div>
      <Divider text={t("divider")} className="my-6" />
    </div>
  );
}
