import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}

// Django's OAuth callback view (apps/users/auth_views.py:_oauth_error_redirect)
// sends the browser to `{FRONTEND_URL}/auth/error?error=<code>` when the
// provider handshake fails. Codes the Django side sends:
//   - exchange_failed, invalid_state, missing_code  → generic OAuth failure
//   - email_not_verified, account_deactivated       → login page handles these
//   - any provider-forwarded error string           → generic OAuth failure
//
// The login page already renders a banner for known codes, so we normalize
// here instead of maintaining a parallel error UI.
//
// `oauth_email_unverified_collision` is no longer emitted by the backend now
// that the inline-account-linking flow ships (it redirects to
// /auth/link-email-sent instead), but is included as defense-in-depth so a
// stale link or backend regression doesn't collapse it to a generic error.
const LOGIN_PASSTHROUGH = new Set([
  "email_not_verified",
  "account_deactivated",
  "oauth_email_unverified_collision",
]);

export default async function AuthErrorPage({ params, searchParams }: Props) {
  const [{ locale }, { error }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const code = error && LOGIN_PASSTHROUGH.has(error) ? error : "oauth_error";
  redirect(`/${locale}/login?error=${encodeURIComponent(code)}`);
}
