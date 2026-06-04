import type { ReactNode } from "react";
import { RecaptchaScript } from "@/lib/recaptcha/RecaptchaScript";

/**
 * Route-group layout for the auth pages. Loads the reCAPTCHA v3 script once so
 * every auth page can acquire a token without each one mounting the script.
 */
export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <RecaptchaScript />
    </>
  );
}
