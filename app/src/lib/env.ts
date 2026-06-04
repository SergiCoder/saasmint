/**
 * Boot-time environment validator. Intentionally zod-free so this module
 * can be imported from the proxy (`src/proxy.ts`) without pulling
 * zod into the per-request proxy bundle.
 */
function requireUrl(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  try {
    new URL(value);
  } catch {
    throw new Error(`Invalid URL in environment variable ${name}: ${value}`);
  }
  return value;
}

export const env = {
  NEXT_PUBLIC_API_URL: requireUrl("NEXT_PUBLIC_API_URL"),
  NEXT_PUBLIC_APP_URL: requireUrl("NEXT_PUBLIC_APP_URL"),
  // Optional: the public reCAPTCHA v3 site key. Empty when unset, which keeps
  // captcha dormant (mirrors the backend treating an empty secret as
  // "disabled"). Static access so the value is also inlined into the browser
  // bundle — note client code must NOT import `env` (the dynamic
  // `process.env[name]` reads above are not inlined client-side); read the key
  // via static `process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY` there instead.
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY:
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "",
} as const;
