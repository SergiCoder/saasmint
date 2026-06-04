import { env } from "@/lib/env";
import { isMemberOf } from "@/lib/typeGuards";

export type OAuthProvider = "google" | "github" | "microsoft";

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = [
  "google",
  "github",
  "microsoft",
];

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return isMemberOf(OAUTH_PROVIDERS, value);
}

export function getOAuthRedirectUrl(provider: OAuthProvider): string {
  return `${env.NEXT_PUBLIC_API_URL}/api/v1/auth/oauth/${provider}/`;
}
