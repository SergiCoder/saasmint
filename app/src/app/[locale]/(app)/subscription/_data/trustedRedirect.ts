/**
 * Shared helpers for validating Stripe-hosted redirect URLs returned by the
 * billing backend. Used by both the server action that opens checkout/portal
 * sessions and the route page that redirects authenticated signups into
 * checkout. Keeping the allow-list and parsing logic in one place ensures the
 * two entry points cannot drift apart.
 */

export const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL!;

const TRUSTED_REDIRECT_HOSTS = ["checkout.stripe.com", "billing.stripe.com"];

export function assertTrustedRedirect(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid redirect URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Untrusted redirect URL");
  }
  if (!TRUSTED_REDIRECT_HOSTS.includes(parsed.hostname)) {
    throw new Error("Untrusted redirect URL");
  }
}
