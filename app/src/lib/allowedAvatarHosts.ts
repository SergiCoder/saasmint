import { env } from "./env";

/**
 * OAuth provider avatar hosts that are allowed to appear in user profiles.
 * Mirrored in the CSP `img-src` directive — keep both in sync. A new entry
 * here without a corresponding CSP update would render in the action but
 * the browser would block the actual image load.
 */
export const OAUTH_AVATAR_HOSTS: readonly string[] = [
  "https://lh3.googleusercontent.com",
  "https://avatars.githubusercontent.com",
  "https://graph.microsoft.com",
];

const apiOrigin: string = (() => {
  try {
    return new URL(env.NEXT_PUBLIC_API_URL).origin;
  } catch {
    return "";
  }
})();

/**
 * Set of `https://host` origins acceptable for `User.avatarUrl`. The Django
 * backend stores its own uploaded avatars under the API origin; OAuth
 * providers' user-info responses ship URLs from one of `OAUTH_AVATAR_HOSTS`.
 * Any other origin is rejected at the server-action boundary as
 * defence-in-depth — the backend authoritatively validates too.
 */
export const ALLOWED_AVATAR_ORIGINS: ReadonlySet<string> = new Set(
  [apiOrigin, ...OAUTH_AVATAR_HOSTS].filter(Boolean),
);
