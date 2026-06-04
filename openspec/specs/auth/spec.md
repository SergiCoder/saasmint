# auth

## Purpose

Defines how SaaSmint authenticates users: a single email/password registration path, JWT access/refresh token pairs issued as the wire response for every successful auth, email verification gating first login, password reset and change flows, and OAuth sign-in (Google/GitHub/Microsoft) with inline account linking. This capability lives in the Django backend (`core/apps/users`) and is consumed by the Next.js frontend (`app`); requirements here describe behavior, not implementation. Operational config (token lifetimes, reCAPTCHA keys, OAuth provider secrets) lives in `core/CLAUDE.md` and `app/CLAUDE.md`.

## Requirements

### Requirement: Single registration path

Account creation SHALL flow through exactly one endpoint, `POST /api/v1/auth/register/`, accepting `email`, `password`, and `full_name`. On success the endpoint SHALL create an unverified user, queue a verification email, and return `201 Created` with a token-pair body (`access_token`, `refresh_token`, `token_type`, `expires_in`) and a `Location` header. A `password` SHALL be at least 10 characters. An email already registered SHALL be rejected with a `409`-class conflict rather than creating a duplicate.

#### Scenario: New account is created unverified

- **WHEN** a client posts a valid `email`, `password`, and `full_name` to `POST /api/v1/auth/register/`
- **THEN** the response is `201` with a token-pair body and a `Location` header
- **AND** the new account is unverified and a verification email is queued

#### Scenario: Duplicate email is rejected

- **WHEN** a client registers with an email that already has an account
- **THEN** the request is rejected with a `409`-class conflict and no duplicate account is created

### Requirement: Login issues a token pair and requires verification

`POST /api/v1/auth/login/` SHALL authenticate an `email`/`password` pair and, on success, return a token-pair body for a verified, active account. Invalid credentials, a deactivated account, and an unverified account SHALL all surface through the same generic invalid-credentials response so that a caller cannot distinguish "wrong password" from "valid but unverified". The frontend SHALL recover from the unverified case by offering a resend-verification link, since that flow is itself enumeration-safe.

#### Scenario: Successful login

- **WHEN** a verified, active user posts correct credentials to `POST /api/v1/auth/login/`
- **THEN** the response is a token-pair body (`access_token`, `refresh_token`, `token_type`, `expires_in`)

#### Scenario: Unverified account cannot log in

- **WHEN** a user with correct credentials but an unverified email attempts to log in
- **THEN** the request is rejected with the generic invalid-credentials response (no distinct signal that the email exists)
- **AND** the frontend surfaces a resend-verification action

#### Scenario: Wrong credentials are indistinguishable from unverified

- **WHEN** a caller submits an incorrect password
- **THEN** the response is the same invalid-credentials envelope used for the unverified and deactivated cases

### Requirement: Logout revokes the refresh token

`POST /api/v1/auth/logout/` SHALL revoke the supplied `refresh_token` and return `204 No Content`, so the token can no longer be rotated for a new access token.

#### Scenario: Refresh token is revoked on logout

- **WHEN** a caller posts a `refresh_token` to `POST /api/v1/auth/logout/`
- **THEN** the response is `204 No Content`
- **AND** the revoked refresh token can no longer be used to refresh

### Requirement: Refresh rotates the token pair

`POST /api/v1/auth/refresh/` SHALL accept a valid `refresh_token`, rotate it, and return a fresh token-pair body. A rejected or malformed refresh token SHALL surface as an authentication failure so the caller clears its session.

#### Scenario: Valid refresh returns new tokens

- **WHEN** a caller posts a valid `refresh_token` to `POST /api/v1/auth/refresh/`
- **THEN** the response is a token-pair body with a new access token and a rotated refresh token

### Requirement: Email verification activates the account

`POST /api/v1/auth/verify-email/` SHALL consume a single-use verification `token`, mark the account verified, and return a token-pair body so the caller is signed in. For an invitee account created without a usable password, the endpoint SHALL require a `password` to bind credentials and SHALL reject the request with a `400`-class `password_required` error when none is supplied; for an account that already has a usable password the `password` field SHALL be ignored.

#### Scenario: Verification marks the account verified

- **WHEN** a caller posts a valid verification `token` for an account that already has a password
- **THEN** the account becomes verified
- **AND** the response is a token-pair body

#### Scenario: Invitee must set a password to verify

- **WHEN** an invitee account with no usable password posts a verification `token` without a `password`
- **THEN** the request is rejected with a `400`-class `password_required` error
- **AND** the account remains unverified until a `password` is supplied

### Requirement: Resend verification is enumeration-safe

`POST /api/v1/auth/resend-verification/` SHALL always respond `200` with a neutral message when the captcha passes, regardless of whether the email exists, is active, or is already verified. When the address belongs to an active, unverified account the endpoint SHALL invalidate any prior unused verification tokens and queue a fresh one, so only the newest link works.

#### Scenario: Unverified account gets a fresh link

- **WHEN** a caller posts the email of an active, unverified account
- **THEN** the response is a neutral `200` message
- **AND** prior unused verification tokens are invalidated and a new verification email is queued

#### Scenario: Unknown or verified email yields the same response

- **WHEN** a caller posts an email with no account, an inactive account, or an already-verified account
- **THEN** the response is the same neutral `200` message and no email is queued

### Requirement: Forgot password is enumeration-safe

`POST /api/v1/auth/forgot-password/` SHALL always respond `200` with a neutral message when the captcha passes, whether or not the address exists. When the address belongs to an active account the endpoint SHALL queue a password-reset email; otherwise it SHALL silently no-op. A failed captcha SHALL return a `400`-class error.

#### Scenario: Reset email queued for an existing account

- **WHEN** a caller posts the email of an active account
- **THEN** the response is a neutral `200` message
- **AND** a password-reset email is queued

#### Scenario: Unknown email yields the same response

- **WHEN** a caller posts an email with no active account
- **THEN** the response is the same neutral `200` message and no email is queued

### Requirement: Reset password also verifies the email

`POST /api/v1/auth/reset-password/` SHALL consume a single-use reset `token`, set the new `password` (minimum 10 characters), and return a token-pair body. Because consuming a link delivered to the account's mailbox proves control of the inbox, the reset SHALL also mark the account verified if it was not already. The reset SHALL revoke all of the account's existing refresh tokens and SHALL invalidate access tokens minted before the reset.

#### Scenario: Reset sets the password and signs in

- **WHEN** a caller posts a valid reset `token` and a new `password`
- **THEN** the password is updated and the response is a token-pair body

#### Scenario: Reset verifies an unverified account

- **WHEN** an unverified account completes a password reset
- **THEN** the account becomes verified as a side effect of consuming the emailed token

#### Scenario: Reset revokes existing sessions

- **WHEN** a password reset completes
- **THEN** all previously issued refresh tokens for the account are revoked
- **AND** access tokens minted before the reset are rejected

### Requirement: Change password requires the current password

`POST /api/v1/auth/change-password/` SHALL require an authenticated caller, SHALL verify the supplied `current_password`, and SHALL reject a mismatch with a `400`-class `invalid_password` error. On success it SHALL set the `new_password` (minimum 10 characters), revoke all existing refresh tokens to force re-login elsewhere, invalidate access tokens minted before the change, and return a fresh token-pair body.

#### Scenario: Successful password change

- **WHEN** an authenticated caller posts the correct `current_password` and a valid `new_password`
- **THEN** the password is updated and the response is a fresh token-pair body
- **AND** previously issued refresh tokens are revoked

#### Scenario: Wrong current password is rejected

- **WHEN** an authenticated caller posts an incorrect `current_password`
- **THEN** the request is rejected with a `400`-class `invalid_password` error and the password is unchanged

### Requirement: OAuth code exchange

`POST /api/v1/auth/oauth/exchange/` SHALL swap a single-use opaque `code` issued by the OAuth callback for a token-pair body, instead of embedding tokens in the browser redirect URL. The code SHALL be valid only for a short window and SHALL be redeemable exactly once; an expired, unknown, or already-redeemed code SHALL be rejected with a `400`-class `invalid_code` error. Concurrent redemptions of the same code SHALL NOT both succeed.

#### Scenario: One-time code is exchanged for tokens

- **WHEN** the frontend posts a freshly issued OAuth `code` to `POST /api/v1/auth/oauth/exchange/`
- **THEN** the response is a token-pair body

#### Scenario: Expired or reused code is rejected

- **WHEN** a caller posts an OAuth `code` that has expired or was already redeemed
- **THEN** the request is rejected with a `400`-class `invalid_code` error

#### Scenario: Concurrent redemption does not double-issue

- **WHEN** two callers race to redeem the same OAuth `code`
- **THEN** at most one redemption succeeds and the other receives `invalid_code`

### Requirement: OAuth account linking by email proof

When an OAuth sign-in returns an email that matches an existing account but cannot be auto-linked, the system SHALL email that account a single-use confirmation link rather than logging the OAuth identity in. `POST /api/v1/auth/oauth/confirm-link/` SHALL consume the link's `token`, attach the provider account to the existing user, mark that user verified, and return a token-pair body. If the provider identity is already linked to a different user, the endpoint SHALL reject the request with a `409`-class `social_account_collision` error.

#### Scenario: Confirming the link attaches the provider and signs in

- **WHEN** a caller posts a valid confirm-link `token` to `POST /api/v1/auth/oauth/confirm-link/`
- **THEN** the OAuth provider account is attached to the existing user
- **AND** the user is marked verified and the response is a token-pair body

#### Scenario: Provider already linked to another user

- **WHEN** the confirm-link `token`'s provider identity is already owned by a different user
- **THEN** the request is rejected with a `409`-class `social_account_collision` error

### Requirement: reCAPTCHA gating on abuse-prone endpoints

The system SHALL verify a reCAPTCHA v3 `captcha_token` server-side on the registration, forgot-password, and resend-verification endpoints, because a caller can hit the API directly without the SPA. A missing, low-scoring, or wrong-action token SHALL be rejected with a `400`-class `captcha_failed` error. When no reCAPTCHA secret is configured, verification SHALL be skipped entirely so the endpoints accept requests without a token. If the verification provider is unreachable, the check SHALL fail open and allow the request.

#### Scenario: Captcha verification skipped when unconfigured

- **WHEN** no reCAPTCHA secret is configured and a caller posts to a captcha-gated endpoint without a `captcha_token`
- **THEN** the request proceeds as if captcha were not required

#### Scenario: Failed captcha is rejected

- **WHEN** reCAPTCHA is configured and a caller submits a missing, low-scoring, or wrong-action `captcha_token`
- **THEN** the request is rejected with a `400`-class `captcha_failed` error

#### Scenario: Captcha fails open when the provider is unreachable

- **WHEN** reCAPTCHA is configured but the verification provider cannot be reached
- **THEN** the request is allowed rather than locking callers out
