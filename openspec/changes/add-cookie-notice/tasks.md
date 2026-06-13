## 1. Configuration

- [x] 1.1 Add `NEXT_PUBLIC_COOKIE_BANNER=true` to the root `.env.example`, in the frontend/`NEXT_PUBLIC_*` section, with a comment explaining it gates an informational cookie notice and that `false`/unset hides it (e.g. US-only / necessary-cookies-only deployments).
- [x] 1.2 Confirm no change is needed in `src/lib/env.ts` (the flag is read statically in the client component, not via the URL-validating `env` loader) — leave a one-line note if helpful, otherwise no edit.

## 2. Localized copy

- [x] 2.1 Add a `cookieNotice` namespace to `app/messages/en.json` with keys for the message, the dismiss label (e.g. "Got it"), and the "learn more" link label.
- [x] 2.2 Mirror the `cookieNotice` namespace into the other 19 locale files (`ar, da, de, es, fr, id, it, ja, ko, nb, nl, pl, pt-BR, pt-PT, ru, sv, tr, zh-CN, zh-TW`) with translated copy.
- [x] 2.3 Verify every locale file contains the same `cookieNotice` keys (key-count / presence check).

## 3. Cookie-notice component

- [x] 3.1 Create a `"use client"` cookie-notice component under `src/presentation/components/` (atomic level appropriate to a dismissible banner, e.g. `molecules/` or `organisms/`), receiving all copy (message, dismiss label, learn-more label + href) as props — no hardcoded strings.
- [x] 3.2 Gate rendering on the static `process.env.NEXT_PUBLIC_COOKIE_BANNER === "true"` expression so disabled builds short-circuit and tree-shake.
- [x] 3.3 Read/write dismissal state in `localStorage` (key `cookie-notice-dismissed`) via `useSyncExternalStore` (server snapshot = dismissed, so nothing paints until the client reads storage — avoids hydration mismatch / flash and the `set-state-in-effect` lint rule); render nothing once dismissed.
- [x] 3.4 Link the "learn more" action to `/cookies` using the i18n-aware `Link` from `@/lib/i18n/navigation`.
- [x] 3.5 Export the component from the relevant atomic-level barrel `index.ts`.

## 4. Mount point

- [x] 4.1 In `src/app/[locale]/layout.tsx` (root locale layout, a server component), resolve the `cookieNotice` i18n namespace and render the component once with the copy + `/cookies` href passed as props, so it covers marketing, auth, and app routes.

## 5. Tests

- [x] 5.1 Add a Vitest test for the component: renders when the flag is enabled and not dismissed; renders nothing when dismissed (localStorage set); dismiss control writes the `localStorage` key and hides the notice. Use the existing `next-intl` + `@/lib/i18n/navigation` test stubs.
- [x] 5.2 Assert the notice sets no cookie (only `localStorage`) as part of the dismissal test.

## 6. Verification

- [x] 6.1 Run `make lint` and `make typecheck` (or the app-scoped equivalents) and fix any issues.
- [x] 6.2 Run `make test-app` and confirm green.
- [ ] 6.3 Manually verify: default `.env.local` shows the banner on a public page, dismissal persists across reload, and building with `NEXT_PUBLIC_COOKIE_BANNER=false` renders nothing.
