# SaaSmint App — CLAUDE.md

Next.js 16 SaaS frontend template paired with `SaaSmint Core`.

## Architecture

Strict hexagonal architecture enforced by layer isolation:

| Layer          | Location                        | Can import                                             |
| -------------- | ------------------------------- | ------------------------------------------------------ |
| Domain         | `src/domain/`                   | nothing external                                       |
| Application    | `src/application/`              | `domain/` only                                         |
| Infrastructure | `src/infrastructure/`           | `domain/`, `application/ports/`                        |
| Presentation   | `src/presentation/`, `src/app/` | `domain/`, `application/use-cases/`, `infrastructure/` |

**Never** import from `infrastructure/` inside `domain/` or `application/`.

## Domain Models

Core types in `src/domain/models/`. All model fields are declared `readonly` (including `readonly string[]` arrays) — treat domain objects as immutable; build new copies rather than mutating in place.

- `User` — authenticated user (id, account type, locale/currency preferences)
- `Org` — organisation record (id, name, slug, logoUrl)
- `OrgMember` — org membership (nested `user: OrgMemberUser`, role: `owner | admin | member`, isBilling flag)
- `Invitation` — org invite (id, org, email, role: `admin | member`, status: `pending | accepted | expired | cancelled | declined`, invitedBy, dates)
- `Plan` — billing plan (context: `personal | team`, tier: `PlanTier` (1=free, 2=basic, 3=pro), interval: `month | year`, single `price`)
- `PlanPrice` — individual plan price point (id, amount, displayAmount, currency)
- `Product` — one-time purchase product (id, name, type: `one_time`, credits, `price`)
- `ProductPrice` — individual product price point (id, amount, displayAmount, currency)
- `Subscription` — active Stripe subscription (status, plan snapshot, seat `quantity`, period dates, trial); team seat count is capped by `MAX_SEATS`
- `PhonePrefix` — reference entry for phone-number country prefixes (prefix, label)

Domain errors in `src/domain/errors/`:

- `AuthError` — authentication / authorisation failures
- `BillingError` — payment and subscription failures
- `OrgError` — organisation management failures
- `ApiError` — generic HTTP failure from the Django API (carries `status`, raw `body`, and a `detail` getter that extracts Django-style `{ detail }` or `string[]` messages)
- `NetworkError` — fetch couldn't reach the server (DNS, connection refused, timeout); carries the original exception as `cause`

All error classes carry a `code: string` field for programmatic handling (`ApiError` defaults its code to `HTTP_<status>`; `NetworkError` is `NETWORK_UNREACHABLE`). `src/lib/friendlyError.ts` turns these into a user-facing string with a fallback.

## Infrastructure

Gateway implementations in `src/infrastructure/`, organised by provider:

- `api/` — `DjangoApi*Gateway` classes that call `SaaSmint Core` via `apiFetch` (auth, user, org, org-member, invitation, plan, product, subscription, reference)
- `auth/` — `cookies.ts` for JWT cookie management (set, clear, read access/refresh tokens)

Reference data (currencies, locales, timezones, phone prefixes) is served via `DjangoApiReferenceGateway` behind `IReferenceGateway`.

Avatar uploads go through the Django API (`POST /account/avatar/`). Client-side image compression (`src/lib/compressImage.ts`) runs before upload.

Each gateway implements a port interface from `src/application/ports/` (e.g. `IOrgGateway`, `IAuthGateway`, `IReferenceGateway`).

`src/infrastructure/registry.ts` exports singleton instances of every gateway — import gateways from the registry, not by instantiating classes directly.

### API client

`src/infrastructure/api/apiClient.ts` exposes four variants on top of a shared `raw()` helper:

- `apiFetch<T>` / `apiFetchVoid` — require an access token; throw `AuthError("NO_SESSION")` if none
- `apiFetchOptional<T>` — send the token when present, fall through to an anonymous request otherwise (used for endpoints that personalize for logged-in users but still work anonymously, e.g. plans list)
- `publicApiFetch<T>` / `publicApiFetchVoid` — never send a token

Non-OK responses are normalized: `401` on an authenticated request becomes `AuthError`; everything else becomes `ApiError(status, body)`. Network failures (ECONNREFUSED, fetch-failed, etc.) are rewrapped as a friendly "Unable to reach the server" error.

### Response parsing

Gateways never cast raw JSON to domain types. The pattern is:

1. `apiFetch<Record<string, unknown>>(...)` to get untyped JSON
2. `keysToCamel(raw)` (or `keysToCamelWithPrice` for Plan/Product/Subscription, plus `flattenPhone` for User) in `src/infrastructure/api/caseTransform.ts` to normalise key shape
3. `UserSchema.parse(...)` etc. from `src/infrastructure/api/schemas.ts` — a set of Zod schemas `satisfies z.ZodType<DomainModel>` that validate and return a correctly-typed domain object

Always validate through the relevant schema when adding a new endpoint; do not re-introduce `keysToCamel<T>()` generic casts.

### Environment variables

Public env vars are validated once at module load in `src/lib/env.ts` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL` must be valid URLs). The validator is intentionally zod-free so `src/proxy.ts` can import `env` without pulling zod into the Edge middleware bundle. Import `env` from `@/lib/env` instead of reading `process.env.NEXT_PUBLIC_*` directly so misconfiguration fails fast with a clear message.

## Authentication

Django issues JWTs directly — no third-party auth provider.

- **Tokens**: Access token (15 min) + refresh token (7 days) stored in HTTP-only secure cookies
- **Login/Signup**: Server actions call Django `POST /auth/login/` and `POST /auth/register/`
- **OAuth**: Server action sets a short-lived `oauth_in_progress` flow cookie and redirects to Django `GET /auth/oauth/{provider}/`. Django completes the provider handshake and redirects back to `/auth/callback#code=<opaque>`. A client component strips the fragment via `history.replaceState` and calls the `exchangeOAuthCode` server action, which validates the flow cookie and exchanges the code at `POST /auth/oauth/exchange/` for tokens. Post-login redirect targets are validated against an allowlist (`src/lib/oauthNext.ts`)
- **Middleware** (`src/proxy.ts`): On routes that actually read the session user, decodes the access token JWT (base64 only), checks expiry, and refreshes via `POST /auth/refresh/` when expired or missing. Anonymous-only routes (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/callback`, `/invitations`) skip the refresh round-trip. The middleware also forwards the current request pathname as an `x-pathname` request header (`PATHNAME_HEADER` in `src/lib/pathname.ts`), so server components can read it via `getPathname()` / `getPathnameWithoutLocale()` without falling back to `usePathname()` on the client.
- **API calls**: `apiClient.ts` reads `access_token` cookie, sends as `Authorization: Bearer` header
- **Email verification**: Django sends verification email, user clicks link → `verify-email` page calls `POST /auth/verify-email/`

## Component Design

Strict atomic design in `src/presentation/components/`:

- `atoms/` — Button, Input, Badge, Avatar, AvatarUpload, Label, Spinner, FullPageSpinner, Logo, SectionLabel, LocaleDropdown, FormattedDate, Divider, GitHubIcon, GoogleIcon, MicrosoftIcon
- `molecules/` — FormField, MetricCard, NavLink, PlanCard, AlertBanner, ConfirmDialog, FeatureCard, StatItem, TrustBar, OrgCard, OAuthButtons, UserMenu, PronounsPicker
- `organisms/` — NavBar, MobileMenuToggle, Footer, PricingTable, PricingSection, PricingIntervalSwitch, SubscriptionCard, OrgMemberList, InvoiceTable, CtaSection, DashboardMock, ErrorView, ProductsGrid, FeaturesGrid, LogoCloud, StatsSection
- `templates/` — MarketingLayout, AuthLayout, AppLayout, PolicyPage

## Presentation Conventions

- Tailwind v4 utility classes only — no CSS modules or styled-components
- Custom design tokens defined in `src/app/globals.css` via `@theme`
- Flat component files: `atoms/Button.tsx` (no folder-per-component)
- One barrel `index.ts` per atomic level for re-exports
- Components receive all user-facing text as props — no hardcoded strings
- Server Components by default; `"use client"` only for interactivity (onClick, onChange, useState)

## Server Actions

Server Actions live in `src/app/actions/` (one file per domain area: `auth.ts`, `avatar.ts`, `billing.ts`, `invitation.ts`, `org.ts`, `user.ts`). Each action instantiates a use-case with a gateway from the registry — never call gateways directly from actions.

## Route Groups

`src/app/[locale]/` uses four route groups with distinct layouts:

- `(marketing)/` — public pages (landing, pricing, blog, about, contact, privacy, terms, cookies) using `MarketingLayout`
- `(auth)/` — login/signup/forgot-password/reset-password/verify-email pages using `AuthLayout`
- `(app)/` — authenticated pages (dashboard, subscription, profile, org) using `AppLayout`
- `(public)/` — unauthenticated public pages (invitation acceptance)

Route-specific client components live in co-located `_components/` directories (e.g. `(app)/subscription/_components/CheckoutButton.tsx`). Shared server-side data fetchers live in co-located `_data/` directories and are wrapped in `React.cache()` so a layout and its pages share a single API call per render (e.g. `(app)/_data/getSubscription.ts`).

## Key Rules

- App Router only (`src/app/`) — no `pages/` directory
- Server Components by default — `"use client"` only when needed
- No raw `fetch` in components — always go through use-cases
- Auth: Django JWT in `Authorization: Bearer <token>` header (read from HTTP-only cookie)
- Payments: Stripe-hosted Checkout redirect only — no embedded forms
- All user-facing strings through next-intl — never hardcoded
- Brand color: teal `#0D9488` (`primary-600`)
- TypeScript runs with `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, and `noFallthroughCasesInSwitch` — array/tuple indexing yields `T | undefined`, so narrow before use instead of reaching for `!`

## Committing

Always use `/commit`. Never commit manually.

## Running

```bash
pnpm install     # first-time setup
pnpm dev         # start dev server on https://localhost:3000 (Turbopack, --experimental-https)
```

The dev script reads the root CA and localhost certs from sibling `../saasmint-core/infra/certs/`; clone both repos side-by-side.

## Testing

```bash
pnpm test             # run all tests once
pnpm test:coverage    # run tests with v8 coverage report
```

Tests live in `tests/` mirroring the `src/` structure (e.g. `src/domain/errors/DomainError.ts` → `tests/domain/errors/DomainError.test.ts`). The test runner is Vitest; configuration is in `vitest.config.ts`.
