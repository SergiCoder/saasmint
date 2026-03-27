# stripe-nextjs — CLAUDE.md

Next.js 15 SaaS frontend template paired with `stripe-django`.

## Architecture

Strict hexagonal architecture enforced by layer isolation:

| Layer          | Location                        | Can import                                             |
| -------------- | ------------------------------- | ------------------------------------------------------ |
| Domain         | `src/domain/`                   | nothing external                                       |
| Application    | `src/application/`              | `domain/` only                                         |
| Infrastructure | `src/infrastructure/`           | `domain/`, `application/ports/`                        |
| Presentation   | `src/presentation/`, `src/app/` | `domain/`, `application/use-cases/`, `infrastructure/` |

**Never** import from `infrastructure/` inside `domain/` or `application/`.

## Component Design

Strict atomic design in `src/presentation/components/`:

- `atoms/` — Button, Input, Badge, Avatar, Label, Spinner, Logo
- `molecules/` — FormField, MetricCard, NavLink, PlanCard, AlertBanner
- `organisms/` — NavBar, Footer, PricingTable, SubscriptionCard, OrgMemberList, InvoiceTable
- `templates/` — MarketingLayout, AuthLayout, AppLayout

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

Backend: `stripe-django` must run on `NEXT_PUBLIC_API_URL` (default: `http://localhost:8001`)
