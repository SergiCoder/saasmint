"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/infrastructure/supabase/client";
import { Button } from "@/presentation/components/atoms/Button";
import { Divider } from "@/presentation/components/atoms/Divider";
import { GoogleIcon } from "@/presentation/components/atoms/GoogleIcon";
import { GitHubIcon } from "@/presentation/components/atoms/GitHubIcon";
import { MicrosoftIcon } from "@/presentation/components/atoms/MicrosoftIcon";

const providers = [
  {
    id: "google" as Provider,
    icon: GoogleIcon,
    labelKey: "continueWithGoogle",
  },
  {
    id: "github" as Provider,
    icon: GitHubIcon,
    labelKey: "continueWithGitHub",
  },
  {
    id: "azure" as Provider,
    icon: MicrosoftIcon,
    labelKey: "continueWithMicrosoft",
  },
] as const;

export function OAuthButtons() {
  const t = useTranslations("auth.oauth");
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);

  async function handleOAuth(provider: Provider) {
    setLoadingProvider(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
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
            className="w-full"
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
