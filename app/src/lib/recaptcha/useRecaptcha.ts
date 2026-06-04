"use client";

import { useCallback } from "react";

// Read the site key via STATIC access so Next.js inlines it into the browser
// bundle. We deliberately do NOT import `env` from "@/lib/env" here: that
// module reads `process.env[name]` dynamically, which Next does not inline
// client-side, so the value would be `undefined` in the browser.
const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

interface Grecaptcha {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

/**
 * Resolves the global `grecaptcha` once the v3 script has executed, polling
 * briefly because `<RecaptchaScript>` loads `afterInteractive` and may not be
 * ready the instant a user submits. Resolves `null` if it never appears.
 */
async function waitForGrecaptcha(timeoutMs = 5000): Promise<Grecaptcha | null> {
  const start = Date.now();
  while (!window.grecaptcha) {
    if (Date.now() - start > timeoutMs) return null;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return window.grecaptcha;
}

/**
 * Returns an `execute(action)` function that produces a fresh reCAPTCHA v3
 * token for the given action name. Resolves `null` when captcha is disabled
 * (no site key), when running outside the browser, or when the script fails to
 * load — callers send the request without a token and let the backend decide
 * (it fails open on its own verification outages).
 */
export function useRecaptcha(): (action: string) => Promise<string | null> {
  return useCallback(async (action: string): Promise<string | null> => {
    if (!SITE_KEY || typeof window === "undefined") return null;

    const grecaptcha = await waitForGrecaptcha();
    if (!grecaptcha) return null;

    return new Promise<string | null>((resolve) => {
      grecaptcha.ready(() => {
        grecaptcha.execute(SITE_KEY, { action }).then(
          (token) => resolve(token),
          () => resolve(null),
        );
      });
    });
  }, []);
}
