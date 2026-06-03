# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Version numbers track the SaaSmint Core backend release they align with, so
some minor versions are skipped (e.g. 0.5.0 → 0.7.0 → 0.11.0). Each entry links
the pull request that introduced it.

## [Unreleased]

Merged into `dev`, not yet released to `main` (targets 0.11.1).

### Added

- OAuth cross-provider account-linking confirmation flow, with a manual-click
  confirmation page that avoids burning the single-use token on email
  pre-fetch ([#57](https://github.com/SergiCoder/saasmint-app/pull/57)).
- Resend-verification flow on login and profile for unverified accounts
  ([#56](https://github.com/SergiCoder/saasmint-app/pull/56)).
- Dual-currency display on plan and product cards when the user's preferred
  currency differs from the billed currency
  ([#58](https://github.com/SergiCoder/saasmint-app/pull/58)).

### Changed

- Applied stack-audit findings and aligned with the backend schema
  ([#59](https://github.com/SergiCoder/saasmint-app/pull/59)).
- Addressed high- and medium-severity findings from the codebase audit
  ([#60](https://github.com/SergiCoder/saasmint-app/pull/60)).

### Fixed

- Prefixed all redirects with the active locale and inlined phone prefixes to
  fix next-intl routing and hydration mismatches
  ([#53](https://github.com/SergiCoder/saasmint-app/pull/53)).
- Refined locale handling, redirects, and profile cleanup
  ([#54](https://github.com/SergiCoder/saasmint-app/pull/54)).
- Used the paid plans' currency for the synthesised free plan card
  ([#55](https://github.com/SergiCoder/saasmint-app/pull/55)).
- Subscription card server-action wiring and tier-based `isUpgrade` check
  ([#63](https://github.com/SergiCoder/saasmint-app/pull/63)).
- Residual findings from multi-profile codebase review
  ([#61](https://github.com/SergiCoder/saasmint-app/pull/61),
  [#62](https://github.com/SergiCoder/saasmint-app/pull/62)).

## [0.11.0] - 2026-05-03

### Added

- Deep-link into the billing portal for upgrades and surfaced scheduled
  downgrades in the subscription UI
  ([#49](https://github.com/SergiCoder/saasmint-app/pull/49)).
- Auto-cancel of a personal subscription on team upgrade, with an opt-out
  ([#41](https://github.com/SergiCoder/saasmint-app/pull/41)).
- Warning to paid users about concurrent billing when accepting an invitation
  ([#40](https://github.com/SergiCoder/saasmint-app/pull/40)).
- Warning about org archival when cancelling a team subscription
  ([#39](https://github.com/SergiCoder/saasmint-app/pull/39)).
- Member deletion unblocked, with subscription-cancel surfaced in dialogs
  ([#38](https://github.com/SergiCoder/saasmint-app/pull/38)).
- User credit balance shown above the upgrade options
  ([#37](https://github.com/SergiCoder/saasmint-app/pull/37)).
- Guided error for OAuth/password email collisions
  ([#42](https://github.com/SergiCoder/saasmint-app/pull/42)).
- Profile note that billing currency locks at first purchase
  ([#43](https://github.com/SergiCoder/saasmint-app/pull/43)).
- Landing CTA and contact form wired to the inquiry endpoint
  ([#35](https://github.com/SergiCoder/saasmint-app/pull/35)).
- Version badge in the marketing footer
  ([#36](https://github.com/SergiCoder/saasmint-app/pull/36)).

### Changed

- Migrated `/billing/subscriptions/me/` to a list envelope with `?context=`
  plumbing ([#44](https://github.com/SergiCoder/saasmint-app/pull/44)).
- Migrated `/billing/credits/me/` to a multi-scope balances envelope
  ([#45](https://github.com/SergiCoder/saasmint-app/pull/45)).
- Dropped `accountType` and the team-intent registration path
  ([#47](https://github.com/SergiCoder/saasmint-app/pull/47)).

### Fixed

- Subscription UI overhaul and invitation email verification
  ([#50](https://github.com/SergiCoder/saasmint-app/pull/50)).
- Aligned team plan and personal card flows
  ([#48](https://github.com/SergiCoder/saasmint-app/pull/48)).
- Hid the auto-cancel notice when a personal subscription is already cancelling
  ([#46](https://github.com/SergiCoder/saasmint-app/pull/46)).

## [0.7.0] - 2026-04-25

### Added

- Free plan card, aligning billing with backend v0.7.0
  ([#32](https://github.com/SergiCoder/saasmint-app/pull/32)).

## [0.5.0] - 2026-04-25

### Added

- Teams feature: organisations, member, and seat management
  ([#14](https://github.com/SergiCoder/saasmint-app/pull/14)).
- Complete billing, pricing, and subscription flows
  ([#12](https://github.com/SergiCoder/saasmint-app/pull/12)).
- Social login, forgot/reset password, and change password
  ([#11](https://github.com/SergiCoder/saasmint-app/pull/11)).
- User profile, avatar upload, and account management
  ([#9](https://github.com/SergiCoder/saasmint-app/pull/9)).

### Changed

- Replaced Supabase with Django JWT authentication
  ([#13](https://github.com/SergiCoder/saasmint-app/pull/13)).
- Parsed gateway responses with Zod and typed errors instead of generic casts
  ([#18](https://github.com/SergiCoder/saasmint-app/pull/18)).
- Refactored server actions onto the `ActionResult` envelope, with subscription
  page cleanup and auth/nav fixes
  ([#26](https://github.com/SergiCoder/saasmint-app/pull/26)).
- Updated branding copy and dashboard quick-start actions
  ([#10](https://github.com/SergiCoder/saasmint-app/pull/10)).
- Various infrastructure cleanups: avatar upload/delete moved into the user
  gateway ([#22](https://github.com/SergiCoder/saasmint-app/pull/22)),
  centralised OAuth URL construction
  ([#23](https://github.com/SergiCoder/saasmint-app/pull/23)), dropped phantom
  `userId` from gateway signatures
  ([#24](https://github.com/SergiCoder/saasmint-app/pull/24)), and removed dead
  use-cases, ports, errors, and i18n keys
  ([#21](https://github.com/SergiCoder/saasmint-app/pull/21)).

### Fixed

- Hardened the OAuth flow, security headers, and server actions
  ([#17](https://github.com/SergiCoder/saasmint-app/pull/17)).
- Fixed next-intl routing, middleware refresh scope, and SSG setup
  ([#20](https://github.com/SergiCoder/saasmint-app/pull/20)).
- Fixed signup/checkout, auth session return, and test gaps
  ([#28](https://github.com/SergiCoder/saasmint-app/pull/28)).

### Performance

- Split server/client component boundaries
  ([#19](https://github.com/SergiCoder/saasmint-app/pull/19)) and additional
  perf & UI cleanup
  ([#25](https://github.com/SergiCoder/saasmint-app/pull/25)).

## [0.4.0] - 2026-04-01

Initial public scaffolding of the Next.js frontend, built on strict hexagonal
layers (domain → application → infrastructure → presentation).

### Added

- Domain layer: models, errors, and tests
  ([#1](https://github.com/SergiCoder/saasmint-app/pull/1)).
- Application layer: ports and use cases
  ([#2](https://github.com/SergiCoder/saasmint-app/pull/2)).
- Infrastructure layer: gateway implementations and DI registry
  ([#3](https://github.com/SergiCoder/saasmint-app/pull/3)).
- Presentation layer: atomic-design component library
  ([#4](https://github.com/SergiCoder/saasmint-app/pull/4)).
- App pages, server actions, and configuration
  ([#5](https://github.com/SergiCoder/saasmint-app/pull/5)).
- MIT license ([#7](https://github.com/SergiCoder/saasmint-app/pull/7)).

### Fixed

- Code-review pass: security, accessibility, performance, DRY, and test
  coverage ([#6](https://github.com/SergiCoder/saasmint-app/pull/6)).

[Unreleased]: https://github.com/SergiCoder/saasmint-app/compare/v0.11.0...dev
[0.11.0]: https://github.com/SergiCoder/saasmint-app/compare/v0.7.0...v0.11.0
[0.7.0]: https://github.com/SergiCoder/saasmint-app/compare/v0.5.0...v0.7.0
[0.5.0]: https://github.com/SergiCoder/saasmint-app/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/SergiCoder/saasmint-app/releases/tag/v0.4.0
