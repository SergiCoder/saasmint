import Script from "next/script";
import { env } from "@/lib/env";
import { getCspNonce } from "@/lib/pathname";

/**
 * Loads the Google reCAPTCHA v3 script. Renders nothing when no site key is
 * configured, keeping captcha dormant in dev/test (mirrors the backend
 * treating an empty secret as "disabled"). The script tag carries the
 * per-request CSP nonce so it's trusted under the `strict-dynamic` policy and
 * can in turn inject the gstatic.com runtime.
 *
 * Mount once in the `(auth)` route-group layout so it covers every page that
 * acquires a token (signup, forgot-password) or shows the resend-verification
 * widget (login, verify-email).
 */
export async function RecaptchaScript() {
  const siteKey = env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return null;

  const nonce = await getCspNonce();

  return (
    <Script
      src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
      strategy="afterInteractive"
      nonce={nonce ?? undefined}
    />
  );
}
