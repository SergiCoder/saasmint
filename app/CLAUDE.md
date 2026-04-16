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

Core types in `src/domain/models/`:

- `User` — authenticated user (id, account type, locale/currency preferences)
- `Org` — organisation record (id, name, slug, logoUrl)
- `OrgMember` — org membership (nested `user: OrgMemberUser`, role: `owner | admin | member`, isBilling flag)
- `Invitation` — org invite (id, org, email, role: `admin | member`, status: `pending | accepted | expired | cancelled`, invitedBy, dates)
- `Plan` — billing plan (context: `personal | team`, tier: `PlanTier` (1=free, 2=basic, 3=pro), interval: `month | year`, single `price`)
- `PlanPrice` — individual plan price point (id, amount, displayAmount, currency)
- `Product` — one-time purchase product (id, name, type: `one_time`, credits, `price`)
- `ProductPrice` — individual product price point (id, amount, displayAmount, currency)
- `Subscription` — active Stripe subscription (status, plan snapshot, period dates, trial)

Domain errors in `src/domain/errors/`:

- `AuthError` — authentication / authorisation failures
- `BillingError` — payment and subscription failures
- `OrgError` — organisation management failures

All error classes carry a `code: string` field for programmatic handling.

## Infrastructure

Gateway implementations in `src/infrastructure/`, organised by provider:

- `api/` — `DjangoApi*Gateway` classes that call `SaaSmint Core` via `apiFetch`
- `auth/` — `cookies.ts` for JWT cookie management (set, clear, read access/refresh tokens)

Avatar uploads go through the Django API (`POST /account/avatar/`). Client-side image compression (`src/lib/compressImage.ts`) runs before upload.

Each gateway implements a port interface from `src/application/ports/` (e.g. `IOrgGateway`, `IAuthGateway`).

`src/infrastructure/registry.ts` exports singleton instances of every gateway — import gateways from the registry, not by instantiating classes directly.

## Authentication

Django issues JWTs directly — no third-party auth provider.

- **Tokens**: Access token (15 min) + refresh token (7 days) stored in HTTP-only secure cookies
- **Login/Signup**: Server actions call Django `POST /auth/login/` and `POST /auth/register/`
- **OAuth**: Redirect to Django `GET /auth/oauth/{provider}/`, Django handles code exchange, redirects back with tokens
- **Middleware** (`src/proxy.ts`): Decodes JWT from cookie (base64 only), checks expiry, refreshes via `POST /auth/refresh/` if needed
- **API calls**: `apiClient.ts` reads `access_token` cookie, sends as `Authorization: Bearer` header
- **Email verification**: Django sends verification email, user clicks link → `verify-email` page calls `POST /auth/verify-email/`

## Component Design

Strict atomic design in `src/presentation/components/`:

- `atoms/` — Button, Input, Badge, Avatar, AvatarUpload, Label, Spinner, Logo, SectionLabel, LocaleDropdown, FormattedDate, Divider, GitHubIcon, GoogleIcon, MicrosoftIcon
- `molecules/` — FormField, MetricCard, NavLink, PlanCard, AlertBanner, ConfirmDialog, FeatureCard, StatItem, TrustBar, OrgCard, OAuthButtons, UserMenu, PronounsPicker
- `organisms/` — NavBar, Footer, PricingTable, PricingSection, SubscriptionCard, OrgMemberList, InvoiceTable, CtaSection, DashboardMock, ErrorView, ProductsGrid, FeaturesGrid, LogoCloud, StatsSection
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

Route-specific client components live in co-located `_components/` directories (e.g. `(app)/subscription/_components/CheckoutButton.tsx`).

## Key Rules

- App Router only (`src/app/`) — no `pages/` directory
- Server Components by default — `"use client"` only when needed
- No raw `fetch` in components — always go through use-cases
- Auth: Django JWT in `Authorization: Bearer <token>` header (read from HTTP-only cookie)
- Payments: Stripe-hosted Checkout redirect only — no embedded forms
- All user-facing strings through next-intl — never hardcoded
- Brand color: teal `#0D9488` (`primary-600`)

## Committing

Always use `/commit`. Never commit manually.

## Running

```bash
make setup    # first-time setup
make dev      # start dev server on port 3000
```

## Testing

```bash
pnpm test             # run all tests once
pnpm test:coverage    # run tests with v8 coverage report
```

Tests live in `tests/` mirroring the `src/` structure (e.g. `src/domain/errors/DomainError.ts` → `tests/domain/errors/DomainError.test.ts`). The test runner is Vitest; configuration is in `vitest.config.ts`.
