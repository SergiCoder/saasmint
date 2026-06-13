## Why

SaaSmint sets only strictly-necessary first-party cookies (JWT session, OAuth flow, locale) and bans third-party trackers by design, so it has no legal *consent* obligation. But many jurisdictions expect a visible transparency notice, and forkers deploying to the EU currently have nothing to surface one — while a US-only deployment shouldn't be forced to show a banner it doesn't need. We want a simple, informational cookie notice that any deployment can turn on or off from configuration without touching code.

## What Changes

- Add an **informational** cookie notice to the public-facing site: a dismissible banner that states the site uses strictly-necessary cookies and links to the existing `/cookies` policy page. It does **not** gate any cookies or scripts (there are none to gate) and offers no per-category opt-in/opt-out.
- Gate the banner behind a build-time env flag `NEXT_PUBLIC_COOKIE_BANNER` (default `true` in `.env.example`). When unset/`false`, nothing renders and no extra bytes ship — covering the US-only / necessary-cookies-only case.
- Persist dismissal in `localStorage` (not a cookie), so dismissing the notice introduces no new cookie of its own.
- Add the banner copy (~3 i18n keys) across all 20 locale message files.
- Document the new env var in `.env.example`.

## Capabilities

### New Capabilities
- `cookie-notice`: An informational, configuration-gated cookie transparency notice shown on the public site. Covers when the notice appears, what it states and links to, its dismissal persistence, and the fact that it gates nothing.

### Modified Capabilities
<!-- None. The environment-config "build-time vs runtime split" already governs NEXT_PUBLIC_* vars; this change adds a variable under that existing rule without changing the requirement. The /cookies policy page already exists and is unchanged. -->

## Impact

- **Frontend (`app/`) only.** New presentation component (cookie-notice banner) mounted in the root `[locale]/layout.tsx` so it covers marketing, auth, and app routes once.
- New build-time env var `NEXT_PUBLIC_COOKIE_BANNER`, read via the static `process.env.NEXT_PUBLIC_COOKIE_BANNER` expression in the client component (so Next inlines it), consistent with the existing `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` pattern.
- `.env.example` gains one documented entry.
- 20 locale files (`messages/*.json`) gain a small `cookieNotice` namespace.
- No backend, no API, no database, no new cookie. No third-party scripts (preserves the existing no-tracker stance).
