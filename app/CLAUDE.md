# stripe-nextjs — CLAUDE.md

Next.js 16 SaaS frontend template paired with `stripe-django`.

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

- `User` — authenticated user (Supabase UID, account type, locale/currency preferences)
- `Org` — organisation record (id, name, slug, logoUrl)
- `OrgMember` — org membership (userId, role: `owner | admin | member`, isBilling flag)
- `Plan` — billing plan (context: `personal | team`, interval: `month | year`, prices)
- `PlanPrice` — individual price point (stripePriceId, currency, amount)
- `Subscription` — active Stripe subscription (status, plan snapshot, period dates, trial)

Domain errors in `src/domain/errors/`:

- `AuthError` — authentication / authorisation failures
- `BillingError` — payment and subscription failures
- `OrgError` — organisation management failures

All error classes carry a `code: string` field for programmatic handling.

## Infrastructure

Gateway implementations in `src/infrastructure/`, organised by provider:

- `api/` — `DjangoApi*Gateway` classes that call `stripe-django` via `apiFetch`
- `supabase/` — `SupabaseAuthGateway` plus `client.ts` / `server.ts` Supabase client factories

Each gateway implements a port interface from `src/application/ports/` (e.g. `IOrgGateway`, `IAuthGateway`).

`src/infrastructure/registry.ts` exports singleton instances of every gateway — import gateways from the registry, not by instantiating classes directly.

## Component Design

Strict atomic design in `src/presentation/components/`:

- `atoms/` — Button, Input, Badge, Avatar, Label, Spinner, Logo
- `molecules/` — FormField, MetricCard, NavLink, PlanCard, AlertBanner, FeatureCard, StatItem, TrustBar
- `organisms/` — NavBar, Footer, PricingTable, SubscriptionCard, OrgMemberList, InvoiceTable, CtaSection, DashboardMock, FeaturesGrid, LogoCloud, StatsSection
- `templates/` — MarketingLayout, AuthLayout, AppLayout

## Presentation Conventions

- Tailwind v4 utility classes only — no CSS modules or styled-components
- Custom design tokens defined in `src/app/globals.css` via `@theme`
- Flat component files: `atoms/Button.tsx` (no folder-per-component)
- One barrel `index.ts` per atomic level for re-exports
- Components receive all user-facing text as props — no hardcoded strings
- Server Components by default; `"use client"` only for interactivity (onClick, onChange, useState)

## Server Actions

Server Actions live in `src/app/actions/` (one file per domain area: `auth.ts`, `billing.ts`, `org.ts`, `user.ts`). Each action instantiates a use-case with a gateway from the registry — never call gateways directly from actions.

## Route Groups

`src/app/[locale]/` uses three route groups with distinct layouts:

- `(marketing)/` — public pages (landing, pricing) using `MarketingLayout`
- `(auth)/` — login/signup pages using `AuthLayout`
- `(app)/` — authenticated pages (dashboard, billing, settings, org) using `AppLayout`

Route-specific client components live in co-located `_components/` directories (e.g. `(app)/billing/_components/CheckoutButton.tsx`).

## Key Rules

- App Router only (`src/app/`) — no `pages/` directory
- Server Components by default — `"use client"` only when needed
- No raw `fetch` in components — always go through use-cases
- Auth: Supabase JWT in `Authorization: Bearer <token>` header
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

Backend: `stripe-django` must run on `NEXT_PUBLIC_API_URL` (default: `http://localhost:8001`)
