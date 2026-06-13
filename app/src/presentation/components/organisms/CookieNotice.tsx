"use client";

import { useSyncExternalStore } from "react";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/presentation/components/atoms/Button";

const DISMISS_KEY = "cookie-notice-dismissed";

// Read the build-time flag via the static `process.env.NEXT_PUBLIC_*` expression
// so Next.js inlines it into the browser bundle (dynamic reads are not inlined),
// matching the reCAPTCHA pattern. When disabled, the constant folds to `false`
// and the render branch tree-shakes away.
const ENABLED = process.env.NEXT_PUBLIC_COOKIE_BANNER === "true";

// Dismissal lives in `localStorage` (not a cookie). A tiny external store lets
// the component read it via `useSyncExternalStore` — the blessed way to surface
// client-only state without a hydration mismatch and without setState-in-effect.
const listeners = new Set<() => void>();

function isDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    // localStorage unavailable (e.g. privacy mode): treat as not dismissed.
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Server render and the first hydration pass treat the notice as dismissed, so
// nothing paints until the client reads localStorage — avoids a flash/mismatch.
function getServerSnapshot(): boolean {
  return true;
}

function dismiss(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, "true");
  } catch {
    // Persisting is best-effort; still hide for this session.
  }
  listeners.forEach((notify) => notify());
}

export interface CookieNoticeProps {
  /** Informational message stating only strictly-necessary cookies are used. */
  message: string;
  /** Label for the link to the cookie policy page. */
  learnMoreLabel: string;
  /** Href of the cookie policy page (e.g. `/cookies`). */
  learnMoreHref: string;
  /** Label for the dismiss control. */
  dismissLabel: string;
  /** Accessible name for the notice landmark region. */
  regionLabel: string;
}

/**
 * Informational, configuration-gated cookie notice. It states that the site
 * uses strictly-necessary cookies and links to the policy page — it gates no
 * cookie or script and offers no consent choices. Dismissal is persisted in
 * `localStorage` (not a cookie). Mounted once in the root locale layout.
 */
export function CookieNotice({
  message,
  learnMoreLabel,
  learnMoreHref,
  dismissLabel,
  regionLabel,
}: CookieNoticeProps) {
  const dismissed = useSyncExternalStore(
    subscribe,
    isDismissed,
    getServerSnapshot,
  );

  if (!ENABLED || dismissed) return null;

  return (
    <div
      role="region"
      aria-label={regionLabel}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {message}{" "}
          <Link
            href={learnMoreHref}
            className="font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700"
          >
            {learnMoreLabel}
          </Link>
        </p>
        <Button size="sm" onClick={dismiss} className="shrink-0">
          {dismissLabel}
        </Button>
      </div>
    </div>
  );
}
