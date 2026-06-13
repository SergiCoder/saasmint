## Context

SaaSmint sets only strictly-necessary first-party cookies — `access_token` / `refresh_token` (JWT session), `oauth_in_progress` (OAuth flow), and `NEXT_LOCALE` (i18n) — and explicitly bans third-party trackers (see the no-third-party-script note in `app/src/app/[locale]/auth/callback/_components/AuthCallbackClient.tsx`). Under GDPR/ePrivacy, strictly-necessary cookies are consent-exempt, so SaaSmint has **no legal consent obligation** today and there is nothing to gate.

A `/cookies` policy page already exists (`app/src/app/[locale]/(marketing)/cookies/page.tsx`, rendered via the `PolicyPage` template from the `cookies` i18n namespace). What is missing is a visible transparency notice and a way to turn it off for deployments that don't want it (e.g. a US-only product). The app has no general "config file" plane: configuration is split across env vars (`src/lib/env.ts`), i18n messages (20 locale files), and small constant modules (`src/lib/appVersion.ts`, `supportedCurrencies.ts`).

## Goals / Non-Goals

**Goals:**
- A dismissible, informational cookie notice on the public site that links to `/cookies`.
- A single configuration switch to enable/disable it per deployment, with no code change.
- Zero new cookies and zero third-party scripts — preserve the existing no-tracker stance.
- Localized copy in all 20 supported locales.

**Non-Goals:**
- No consent management: no accept/reject, no per-category toggles, no consent ledger.
- No script/cookie gating — there is nothing non-essential to gate.
- No new general-purpose "config file" abstraction; reuse the existing env-var plane.
- No backend, API, or database change.
- No region/geo-IP detection — enablement is a deploy-time choice, not runtime per-visitor.

## Decisions

### Configuration via `NEXT_PUBLIC_COOKIE_BANNER` (build-time env), default `true`

The notice is gated by a boolean-ish env var `NEXT_PUBLIC_COOKIE_BANNER`, shipped enabled in `.env.example`.

- **Why env over a TS config module:** the only knob that matters is on/off, and it varies per *deployment*, not per build artifact's source. Env vars are the existing plane for deployment-varying config and need no rebuild of source to change. A US-only forker sets `false`; an EU-facing one leaves the default.
- **Why build-time (`NEXT_PUBLIC_*`) not runtime:** the notice is a client-side presentation concern with no secret; the `environment-config` spec already bakes `NEXT_PUBLIC_*` as Docker build args. No new config rule is introduced.
- **Read pattern:** the client component reads the *static* `process.env.NEXT_PUBLIC_COOKIE_BANNER` expression (not via `src/lib/env.ts`), mirroring the existing `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` handling — Next.js only inlines statically-referenced `process.env.NEXT_PUBLIC_*` reads into the browser bundle. `src/lib/env.ts` validates URLs with `new URL()`, which a boolean would not satisfy, so the flag stays out of that validator.
- **Truthiness:** treat the value as enabled when it equals `"true"` (string compare), disabled otherwise (unset, `""`, `"false"`). Documented in `.env.example`.
- _Alternative considered:_ a `site.config.ts` module (like `appVersion.ts`). Rejected for now — it would introduce a fourth config plane for a single boolean, and toggling it would require editing committed source rather than a deploy var.

### Informational only — no gating, no consent UI

The banner shows a short message + a "learn more" link to `/cookies` + a dismiss control. It never blocks rendering and sets nothing conditionally.

- **Why:** every cookie is strictly-necessary and consent-exempt; a consent gate would be machinery with nothing to manage. Keeping it informational matches the actual legal position and the no-tracker architecture.
- **Forward path:** if non-essential cookies/analytics are ever added (today banned), this notice does **not** become a compliant consent tool — that would be a separate, larger change (categories, gating, CSP-nonce script loading). This change deliberately does not pre-build that.

### Dismissal in `localStorage`, not a cookie

Dismissal is recorded under a `localStorage` key (e.g. `cookie-notice-dismissed`).

- **Why:** a purely informational notice storing its own dismissal as a *cookie* would be faintly absurd and would add a cookie the policy page then has to document. `localStorage` is not sent to the server, persists across reloads/navigation, and keeps the cookie surface unchanged.
- **SSR/hydration:** `localStorage` is unavailable during SSR, so the dismissal flag is surfaced via `useSyncExternalStore` (the `getServerSnapshot` returns "dismissed" so nothing paints on the server / first hydration pass, then the client snapshot reads `localStorage`) — this avoids a hydration mismatch / flash without a setState-in-effect (which the repo's `react-hooks/set-state-in-effect` lint rule forbids). The env flag is checked first so disabled builds short-circuit before any client work.

### Mounted once in the root `[locale]/layout.tsx`

The banner mounts in the locale root layout so it covers marketing, auth, and app routes with a single instance, rather than per-route-group.

- **Why:** an informational notice is a first-visit, site-wide concern; mounting per route group would duplicate it and risk inconsistent dismissal scope. The dismissal key is global, so one mount point keeps behavior uniform.
- **Component placement:** a presentation component under `src/presentation/components/` (atomic structure). Per the component rules it receives all copy as props; the layout (a server component) resolves the `cookieNotice` i18n namespace and passes strings down, keeping the client component text-free.

### Copy in a new `cookieNotice` i18n namespace (×20 locales)

~3 keys: the message, the dismiss/"got it" label, and the "learn more" link label. Added to every `messages/*.json`.

- **Why:** the "no hardcoded strings / all user-facing text through next-intl" rule is non-negotiable; structure lives in code, words live in i18n.

## Risks / Trade-offs

- **20-locale copy drift** → the message ships in all locale files in the same change; reviewers verify each `cookieNotice` block is present (a simple key-count check).
- **Flash of banner before dismissal read** → render nothing until the client effect has read `localStorage`; gate on the env flag first so disabled builds never run that path.
- **"Boolean" env var ambiguity** → pin truthiness to an exact `"true"` string compare and document it in `.env.example`; avoids `"false"`/`"0"` being treated as enabled.
- **Toggling requires a rebuild** (build-time var) → acceptable: enablement is a per-deployment decision set once, and the `environment-config` spec already treats `NEXT_PUBLIC_*` as build-baked. Documented as expected behavior, not a bug.
- **Scope creep toward consent management** → explicitly a non-goal; the spec states the notice gates nothing, so a future consent feature is a separate proposal rather than an extension of this one.
