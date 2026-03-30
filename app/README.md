# stripe-nextjs

Next.js 16 SaaS frontend template paired with [stripe-django](https://github.com/SergiCoder/stripe-django).

## Stack

- **Framework** — Next.js 16 (App Router, React 19, Turbopack)
- **Auth** — Supabase (JWT)
- **Payments** — Stripe (hosted Checkout)
- **i18n** — next-intl
- **Styling** — Tailwind CSS 4

## Architecture

Hexagonal architecture with strict layer isolation:

| Layer          | Location                        | Can import                                             |
| -------------- | ------------------------------- | ------------------------------------------------------ |
| Domain         | `src/domain/`                   | nothing external                                       |
| Application    | `src/application/`              | `domain/` only                                         |
| Infrastructure | `src/infrastructure/`           | `domain/`, `application/ports/`                        |
| Presentation   | `src/presentation/`, `src/app/` | `domain/`, `application/use-cases/`, `infrastructure/` |

## Getting started

```bash
make setup    # install dependencies
make dev      # start dev server on port 3000
```

## Testing

```bash
pnpm test             # run all tests once
pnpm test:coverage    # run tests with v8 coverage report
```

The backend ([stripe-django](https://github.com/SergiCoder/stripe-django)) must be running on `http://localhost:8001`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`

## Plugins

- [Prism](https://github.com/SergiCoder/prism) — Claude Code plugin for multi-profile code review, conventional commits, branching, and PR workflows

## License

[MIT](LICENSE)
