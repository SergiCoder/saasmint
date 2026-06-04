# marketing

## Purpose

Defines how SaaSmint captures prospect interest from its public site: landing-page CTA and Contact-form submissions are validated, then forwarded to an internal inbox so the team can follow up. This capability is a thin, unauthenticated intake endpoint exposed by the Django backend (`core/apps/marketing`) and consumed by the Next.js marketing pages (`app`); requirements here describe behavior, not implementation. Operational detail — the destination inbox address and throttle tuning — lives in `core/CLAUDE.md`.

## Requirements

### Requirement: Inquiry submission and validation

`POST /api/v1/marketing/inquiries/` SHALL accept a public, unauthenticated submission carrying `email` (a valid address, max 254 characters), a `source` of either `landing-cta` or `contact-page`, and an optional free-text `message` (max 5000 characters, trimmed of surrounding whitespace). A `contact-page` inquiry SHALL require a non-empty `message`, while a `landing-cta` inquiry MAY omit it. A valid submission SHALL return `204 No Content` with an empty body; an invalid submission SHALL be rejected with a `400`-class error and SHALL NOT be forwarded.

#### Scenario: Landing CTA accepts email only

- **WHEN** a visitor posts a valid `email` with `source=landing-cta` and no `message`
- **THEN** the response is `204 No Content` with an empty body

#### Scenario: Contact page requires a message

- **WHEN** a visitor posts `source=contact-page` without a `message`
- **THEN** the request is rejected with a `400`-class error naming the `message` field
- **AND** no inquiry is forwarded

#### Scenario: Invalid email or unknown source is rejected

- **WHEN** a submission has a malformed `email`, a missing `email`, an over-length `message`, or a `source` outside `landing-cta`/`contact-page`
- **THEN** the request is rejected with a `400`-class error
- **AND** no inquiry is forwarded

### Requirement: Delivery to the marketing inbox

A validated inquiry SHALL be forwarded to the configured marketing inbox, carrying the submission's `source`, sender `email`, and `message`. Delivery SHALL be dispatched asynchronously so the endpoint returns `204` without blocking on mail send. Logging of the submission SHALL redact the sender's email local-part and SHALL NOT record the `message` body. When the destination inbox is not configured, the endpoint SHALL fail with a `500`-class error carrying code `marketing_inbox_unconfigured` rather than silently dropping the inquiry.

#### Scenario: Validated inquiry is forwarded asynchronously

- **WHEN** a visitor submits a valid inquiry and the inbox is configured
- **THEN** a forwarding job is enqueued with the inquiry's `source`, sender `email`, and `message`
- **AND** the endpoint returns `204` without waiting for the email to send

#### Scenario: Submission logging protects PII

- **WHEN** an inquiry is accepted
- **THEN** any log entry redacts the sender email local-part (e.g. `j***@example.com`)
- **AND** the `message` body is not written to logs

#### Scenario: Unconfigured inbox surfaces an error

- **WHEN** a valid inquiry is submitted but no marketing inbox is configured
- **THEN** the response is a `500`-class error with code `marketing_inbox_unconfigured`
- **AND** no inquiry is forwarded

### Requirement: Anti-abuse protections

The endpoint SHALL carry a honeypot field that is invisible to real users: when the honeypot is non-empty the submission SHALL be silently dropped, returning the same `204 No Content` as a genuine success so a bot cannot distinguish the outcome, and SHALL NOT be forwarded. The endpoint SHALL additionally be rate-limited per client IP on its own throttle scope, independent of authentication flows, so a single source cannot flood the marketing inbox.

#### Scenario: Honeypot submission is silently dropped

- **WHEN** a submission arrives with a non-empty honeypot field
- **THEN** the response is `204 No Content`, indistinguishable from a real success
- **AND** no inquiry is forwarded

#### Scenario: Per-IP rate limit guards the inbox

- **WHEN** a single client IP exceeds the marketing-inquiry throttle within its window
- **THEN** further submissions from that IP are rejected with a `429`-class throttle error
- **AND** the limit applies on a dedicated scope separate from auth-flow throttling
