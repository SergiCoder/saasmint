import { env } from "@/lib/env";

export type OAuthProvider = "google" | "github" | "microsoft";

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = [
  "google",
  "github",
  "microsoft",
];

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return (
    typeof value === "string" &&
    (OAUTH_PROVIDERS as readonly string[]).includes(value)
  );
}

export interface OAuthRedirectOptions {
  readonly isTeam?: boolean;
}

export function getOAuthRedirectUrl(
  provider: OAuthProvider,
  options: OAuthRedirectOptions = {},
): string {
  const url = new URL(
    `${env.NEXT_PUBLIC_API_URL}/api/v1/auth/oauth/${provider}/`,
  );
  if (options.isTeam) {
    url.searchParams.set("account_type", "org_owner");
  }
  return url.toString();
}
