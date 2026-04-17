"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/presentation/components/atoms/Button";
import { Divider } from "@/presentation/components/atoms/Divider";
import { GoogleIcon } from "@/presentation/components/atoms/GoogleIcon";
import { GitHubIcon } from "@/presentation/components/atoms/GitHubIcon";
import { MicrosoftIcon } from "@/presentation/components/atoms/MicrosoftIcon";
import { startOAuth, type OAuthProvider } from "@/app/actions/auth";

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
  context?: "personal" | "team";
}

export function OAuthButtons({ plan, context }: OAuthButtonsProps = {}) {
  const t = useTranslations("auth.oauth");
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(
    null,
  );

  async function handleOAuth(provider: OAuthProvider) {
    setLoadingProvider(provider);
    const isTeam = context === "team";
    // The server action re-validates the plan slug and `next` path via
    // validateNext / isValidPlanSlug, so no client-side sanitation is needed.
    const nextPath = plan
      ? `${
          isTeam ? "/subscription/team-checkout" : "/subscription/checkout"
        }?plan=${encodeURIComponent(plan)}`
      : "/dashboard";

    try {
      const { redirectUrl } = await startOAuth(provider, nextPath);
      window.location.assign(redirectUrl);
    } catch {
      setLoadingProvider(null);
    }
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
