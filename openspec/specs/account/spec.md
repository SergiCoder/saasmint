# account

## Purpose

Defines how a signed-in SaaSmint user reads and maintains their own profile: retrieving and patching identity and preference fields, uploading and removing an avatar, surfacing an unverified-email warning, and exercising GDPR rights of access (data export) and erasure (account deletion). This capability spans the Django backend (`core/apps/users`) and the Next.js frontend (`app`); requirements here describe behavior, not implementation. Login, registration, password, email-verification, and OAuth flows belong to the separate `auth` capability and are not duplicated here.

## Requirements

### Requirement: Retrieve the current user's profile

`GET /api/v1/account/` SHALL return the authenticated caller's own profile and no one else's. The response SHALL include the caller's identity and preference fields (`id`, `email`, `full_name`, `avatar_url`, `preferred_locale`, `preferred_currency`, `phone`, `timezone`, `job_title`, `pronouns`, `bio`), the `is_verified` flag, the `registration_method`, and the list of `linked_providers`. The `phone` field SHALL be a nested `{prefix, number}` object, or `null` when no phone is set. The endpoint SHALL require authentication.

#### Scenario: Authenticated profile read

- **WHEN** an authenticated caller requests `GET /api/v1/account/`
- **THEN** the response is the caller's own profile including `is_verified`, `registration_method`, and `linked_providers`
- **AND** the `phone` field is a `{prefix, number}` object or `null` when unset

#### Scenario: Unauthenticated profile read is rejected

- **WHEN** an unauthenticated client requests `GET /api/v1/account/`
- **THEN** the request is rejected with a `401`-class error

### Requirement: Update profile fields

`PATCH /api/v1/account/` SHALL apply a partial update to the caller's own profile and return the full updated profile. Only the supplied fields SHALL change; omitted fields SHALL be left untouched. The endpoint SHALL validate `preferred_locale` against the supported locales, `preferred_currency` against the supported currencies, `timezone` against IANA timezone identifiers, and a supplied `phone.prefix` against the supported phone prefixes, rejecting an unsupported value with a `400`-class validation error. Identity-critical and server-owned fields (`id`, `email`, `is_verified`, `registration_method`, `linked_providers`, timestamps) SHALL be read-only and SHALL NOT be writable through this endpoint.

#### Scenario: Partial update changes only supplied fields

- **WHEN** a caller PATCHes `GET /api/v1/account/` with only `job_title`
- **THEN** `job_title` is updated and the full updated profile is returned
- **AND** all other profile fields are unchanged

#### Scenario: Unsupported preference value is rejected

- **WHEN** a caller PATCHes an unsupported `preferred_currency`, `preferred_locale`, `timezone`, or `phone.prefix`
- **THEN** the request fails validation with a `400`-class error and no field is changed

#### Scenario: Clearing the phone number

- **WHEN** a caller PATCHes `phone` to `null`
- **THEN** the stored phone prefix and number are both cleared and the returned `phone` is `null`

### Requirement: Unverified-email profile warning

The profile read SHALL expose an `is_verified` flag reflecting whether the caller has confirmed their email address. When `is_verified` is false the application SHALL surface a profile warning prompting the user to verify their email, with a path to resend the verification email. Email verification itself is performed by the `auth` capability; this capability only reports the verification state.

#### Scenario: Unverified user sees a warning

- **WHEN** a caller whose profile has `is_verified=false` loads their account
- **THEN** the UI surfaces a verify-your-email warning with a resend affordance

#### Scenario: Verified user sees no warning

- **WHEN** a caller whose profile has `is_verified=true` loads their account
- **THEN** no verification warning is shown

### Requirement: Avatar upload and removal

`POST /api/v1/account/avatar/` SHALL accept a multipart image upload, replace any previous avatar, and return `201 Created` with `{avatar_url}` (and a matching `Location` header). The client SHALL compress the image before upload. The server SHALL re-encode the image to a normalized square raster and persist only the re-encoded bytes, never the original bytes or the client-supplied filename/content type. The endpoint SHALL reject an unsupported or undecodable image, and SHALL reject an upload over the size cap, with a `400`-class error. `DELETE /api/v1/account/avatar/` SHALL remove the caller's avatar and return `204 No Content`, after which the profile's `avatar_url` is null.

#### Scenario: Successful avatar upload

- **WHEN** a caller posts a valid image to `POST /api/v1/account/avatar/`
- **THEN** the response is `201` with `{avatar_url}` and a matching `Location` header
- **AND** any previously stored avatar is replaced

#### Scenario: Non-image or oversized upload is rejected

- **WHEN** a caller uploads an unsupported, undecodable, or oversized file
- **THEN** the request is rejected with a `400`-class error and no avatar is stored

#### Scenario: Avatar removal

- **WHEN** a caller requests `DELETE /api/v1/account/avatar/`
- **THEN** the response is `204` and the profile's `avatar_url` is subsequently null

### Requirement: User data export (GDPR right of access)

`GET /api/v1/account/export/` SHALL return all data stored about the authenticated caller as a JSON-serializable document suitable for direct download, scoped to the caller only. The document SHALL include the caller's `user` profile, and SHALL include `stripe_customer` and subscription data only when such records exist for the caller. The endpoint SHALL require authentication and SHALL be rate-limited to a stricter cap than ordinary profile reads.

#### Scenario: Export the caller's data

- **WHEN** an authenticated caller requests `GET /api/v1/account/export/`
- **THEN** the response is a JSON document containing the caller's `user` data
- **AND** `stripe_customer` and subscription data are included only when those records exist

### Requirement: Account deletion (GDPR right to erasure)

`DELETE /api/v1/account/` SHALL permanently erase the caller's account and all associated data, returning `204 No Content`. The operation SHALL cancel any active Stripe subscription, delete the caller's Stripe customer and stored payment methods, hard-delete the user record, and remove the caller's organization memberships. When the caller owns an organization, the owned organization SHALL be deleted as part of erasure. Deletion SHALL be terminal: after it completes, the caller's prior credentials and tokens no longer authenticate.

#### Scenario: Delete account erases user and billing data

- **WHEN** an authenticated caller requests `DELETE /api/v1/account/`
- **THEN** the response is `204`, any active Stripe subscription is canceled, and the user record and its memberships are erased

#### Scenario: Owner deletion removes the owned organization

- **WHEN** a caller who owns an organization deletes their account
- **THEN** the owned organization is deleted as part of the erasure
