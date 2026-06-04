# orgs

## Purpose

Defines how SaaSmint models organizations: a team of members with a role hierarchy (`owner`/`admin`/`member`), a token-based invitation lifecycle for onboarding new accounts, a billing-authority flag, and a seat budget anchored to the team subscription. This capability spans the Django backend (`core/apps/orgs`) and the Next.js frontend (`app`); requirements here describe behavior, not implementation. Operational detail (DB constraints, migrations, cascade mechanics) lives in `core/CLAUDE.md`.

## Requirements

### Requirement: Org membership scopes visibility and access

An org SHALL be visible only to its members. `GET /api/v1/orgs/` SHALL return the DRF paginated envelope of orgs the caller belongs to, and `GET /api/v1/orgs/{org_id}/` SHALL return a single org only when the caller is a member. A request for an org the caller does not belong to SHALL be rejected as inaccessible, and a request for an org that does not exist SHALL be rejected as not found.

#### Scenario: List only the caller's orgs

- **WHEN** a caller requests `GET /api/v1/orgs/`
- **THEN** the response is a paginated `{count,next,previous,results}` envelope containing only orgs in which the caller holds a membership

#### Scenario: Non-member is denied org detail

- **WHEN** a caller requests `GET /api/v1/orgs/{org_id}/` for an org they are not a member of
- **THEN** the request is rejected as inaccessible rather than returning the org

### Requirement: Org profile edits require admin or owner

`PATCH /api/v1/orgs/{org_id}/` SHALL update editable org fields (`name`, `logo_url`) and SHALL require the caller to hold the `admin` or `owner` role. A `logo_url` SHALL be accepted only over HTTPS so a stored value can never redirect the browser into a non-HTTPS or script-scheme context. A plain `member` SHALL NOT be able to edit the org.

#### Scenario: Admin updates org name

- **WHEN** an `admin` issues `PATCH /api/v1/orgs/{org_id}/` with a new `name`
- **THEN** the org is updated and the updated org is returned

#### Scenario: Member edit is rejected

- **WHEN** a plain `member` issues `PATCH /api/v1/orgs/{org_id}/`
- **THEN** the request is rejected for insufficient permission and the org is unchanged

#### Scenario: Non-HTTPS logo URL is rejected

- **WHEN** a caller submits a `logo_url` that is not an `https://` URL
- **THEN** the request fails validation and the logo is not changed

### Requirement: Role hierarchy governs member management

Roles SHALL be ranked `owner > admin > member`. `GET /api/v1/orgs/{org_id}/members/` SHALL list members to any member of the org. `PATCH /api/v1/orgs/{org_id}/members/{user_id}/` SHALL require the caller to be `admin` or `owner`, and a caller SHALL NOT modify, assign a role to, or otherwise manage a member whose role is equal to or above the caller's own. The `owner` role SHALL NOT be assignable through member PATCH or through invitations — ownership changes only through the dedicated ownership-transfer endpoint.

#### Scenario: Admin cannot manage another admin

- **WHEN** an `admin` issues `PATCH /api/v1/orgs/{org_id}/members/{user_id}/` targeting another `admin`
- **THEN** the request is rejected because the target's role is at or above the caller's

#### Scenario: Admin cannot promote to a role at or above their own

- **WHEN** an `admin` attempts to assign the `admin` role to a `member`
- **THEN** the request is rejected because the new role is equal to or above the caller's own

#### Scenario: Owner role is not assignable via PATCH

- **WHEN** a caller attempts to set a member's role to `owner` via `PATCH /api/v1/orgs/{org_id}/members/{user_id}/`
- **THEN** the request fails validation because `owner` is assignable only through ownership transfer

### Requirement: Exactly one owner per org and per user

Each org SHALL have exactly one `owner`, and a user SHALL own at most one org. The owner uniqueness invariant SHALL hold even under concurrent attempts to create or transfer ownership, so two parallel operations cannot both make the same user an owner. A caller who already owns an org SHALL NOT be able to start a second one.

#### Scenario: A user owns at most one org

- **WHEN** a user who already owns an org attempts to become the owner of another via concurrent team checkouts
- **THEN** at most one ownership takes effect and the other attempt is rejected

### Requirement: Owners always carry billing authority

The `owner` of an org SHALL always have `is_billing=True`; the owner's billing authority SHALL NOT be removable while they remain owner. Non-owner members (`admin` or `member`) MAY be granted or revoked `is_billing` via member PATCH by an authorized caller. `is_billing=True` SHALL be the gate that authorizes team-context subscription mutations.

#### Scenario: Admin granted billing authority

- **WHEN** an authorized caller sets `is_billing=true` on an `admin` member via `PATCH /api/v1/orgs/{org_id}/members/{user_id}/`
- **THEN** that admin gains billing authority for the team context

#### Scenario: Owner retains billing authority

- **WHEN** any membership change leaves a user as the org `owner`
- **THEN** that owner still carries `is_billing=True`

### Requirement: Ownership transfer is owner-only and idempotent

`POST /api/v1/orgs/{org_id}/owner-transfers/` SHALL transfer ownership to a target member and SHALL require the caller to be the current `owner`. The target SHALL already be an `admin` of the org. On success the new owner SHALL receive the `owner` role with `is_billing=True`, the former owner SHALL be demoted to `admin` and lose `is_billing`, and the endpoint SHALL return `201 Created` with a `Location` header for the new owner-member resource. Replaying the request once the target is already the owner SHALL be a no-op.

#### Scenario: Owner transfers to an admin

- **WHEN** the `owner` posts `POST /api/v1/orgs/{org_id}/owner-transfers/` naming an `admin` member
- **THEN** the response is `201` and the target becomes `owner` with `is_billing=True`
- **AND** the former owner becomes `admin` and loses `is_billing`

#### Scenario: Transfer target must be an admin

- **WHEN** the `owner` attempts to transfer ownership to a plain `member`
- **THEN** the request is rejected because ownership can only be transferred to an admin

#### Scenario: Non-owner cannot transfer ownership

- **WHEN** an `admin` posts `POST /api/v1/orgs/{org_id}/owner-transfers/`
- **THEN** the request is rejected because only the current owner may transfer ownership

### Requirement: Removing a member hard-deletes their account

`DELETE /api/v1/orgs/{org_id}/members/{user_id}/` SHALL require the caller to be `admin` or `owner` and SHALL be subject to the role-hierarchy guard (a caller cannot remove a member at or above their own role). Removal SHALL hard-delete the target's user account along with the membership. The `owner` SHALL NOT be removable — ownership must be transferred first. Removal SHALL NOT decrement the org's purchased seat count; the freed seat SHALL become available for a new invitation.

#### Scenario: Admin removes a member

- **WHEN** an `admin` issues `DELETE /api/v1/orgs/{org_id}/members/{user_id}/` for a plain `member`
- **THEN** the membership and the member's user account are deleted
- **AND** the org's purchased seat count is unchanged so the seat opens for a new invite

#### Scenario: Owner cannot be removed

- **WHEN** a caller attempts to remove the `owner` via `DELETE /api/v1/orgs/{org_id}/members/{user_id}/`
- **THEN** the request is rejected and the owner must be changed via ownership transfer first

### Requirement: Invitations are created by admins within the seat budget

`POST /api/v1/orgs/{org_id}/invitations/` SHALL require the caller to be `admin` or `owner` and SHALL create a pending invitation carrying an invitee `email`, an assignable `role` (`admin` or `member`, defaulting to `member`), and a single-use token. The system SHALL reject an invitation whose email already belongs to a registered account, SHALL reject a second pending invitation to the same email in the same org, and SHALL reject creation when the org has reached its seat limit. `GET /api/v1/orgs/{org_id}/invitations/` SHALL list pending invitations to admins/owners. `DELETE /api/v1/orgs/{org_id}/invitations/{invitation_id}/` SHALL cancel a pending invitation.

#### Scenario: Admin invites a new member

- **WHEN** an `admin` posts `POST /api/v1/orgs/{org_id}/invitations/` with an unregistered email
- **THEN** the response is `201` with a pending invitation and an email is dispatched to the invitee

#### Scenario: Inviting an already-registered email is rejected

- **WHEN** an invitation is created for an email that already has an account
- **THEN** the request is rejected with a conflict because the email is already registered

#### Scenario: Duplicate pending invitation is rejected

- **WHEN** a second invitation is created for an email that already has a pending invitation in the same org
- **THEN** the request is rejected with a conflict

#### Scenario: Invitation rejected when seats are full

- **WHEN** an invitation is created while the org's members plus pending invitations already meet the team subscription `seatLimit`
- **THEN** the request is rejected because the org has reached its seat limit

### Requirement: Public invitation lookup never leaks PII

`GET /api/v1/invitations/{token}/` SHALL be unauthenticated and SHALL return only a non-PII shape for a pending invitation: the org, the role, the status, the inviter reduced to a display name, and timestamps. It SHALL NOT include the invitee email or any inviter email, so that a leaked or guessed token cannot be used to enumerate addresses.

#### Scenario: Token holder sees org context without addresses

- **WHEN** an unauthenticated client requests `GET /api/v1/invitations/{token}/` for a pending invitation
- **THEN** the response includes the org name, role, and inviter display name
- **AND** the response omits the invitee email and any inviter email

### Requirement: Accepting an invitation creates an account without binding a password

`POST /api/v1/invitations/{token}/accept/` SHALL be unauthenticated, accept only the invitee's `full_name`, and on success create the invitee's user account and membership with the invitation's role, mark the invitation `accepted`, and return `201 Created` with the org. The account SHALL be created without a usable password; the password SHALL be set only later through the verification-email flow, so a leaked accept link cannot bind an attacker-chosen password. Acceptance SHALL be rejected if the invitation has expired, if the email has become registered in the meantime, or if accepting would exceed the team's seat cap.

#### Scenario: Invitee accepts and joins the org

- **WHEN** an invitee posts `POST /api/v1/invitations/{token}/accept/` with a valid `full_name`
- **THEN** the response is `201` with the org, the membership is created with the invited role, and the invitation is marked accepted
- **AND** a verification email is sent and no password is set by this request

#### Scenario: Expired invitation cannot be accepted

- **WHEN** an invitee accepts an invitation whose expiry has passed
- **THEN** the request is rejected as gone and the invitation is marked expired

#### Scenario: Acceptance rejected when seats are full

- **WHEN** accepting the invitation would push the org's member count beyond the team subscription `seatLimit`
- **THEN** the request is rejected because the org has filled every seat on its current subscription

### Requirement: Declining an invitation requires the invitee

`POST /api/v1/invitations/{token}/decline/` SHALL require an authenticated caller whose email matches the invitee's, and SHALL mark a pending invitation `declined`. A caller whose email does not match the invitee SHALL be rejected, so a leaked or guessed token cannot cancel someone else's invitation.

#### Scenario: Invitee declines their own invitation

- **WHEN** an authenticated user whose email matches the invitee posts `POST /api/v1/invitations/{token}/decline/`
- **THEN** the invitation is marked declined

#### Scenario: Mismatched account cannot decline

- **WHEN** an authenticated user whose email differs from the invitee posts to the decline endpoint
- **THEN** the request is rejected because the invitation is addressed to another account

### Requirement: Seat budget is authoritative from the subscription

The seat budget SHALL be derived from the team subscription: `seatLimit` is the purchased capacity (authoritative — never a hardcoded constant) and `seatsUsed` is the count of accepted members. Seat-consuming operations — invitation creation and invitation acceptance — SHALL be checked against `seatLimit` counting both current members and pending invitations, and the check SHALL hold under concurrency so parallel invites or accepts cannot overrun the cap. When an org has no active team subscription, seat checks SHALL be skipped rather than blocking.

#### Scenario: Pending invitations count against the seat budget

- **WHEN** the sum of current members and pending invitations equals `seatLimit`
- **THEN** further invitation creation is rejected until a seat is freed or `seatLimit` is raised

#### Scenario: Concurrent acceptances cannot overrun the cap

- **WHEN** two invitations to the last remaining seat are accepted concurrently
- **THEN** only one acceptance succeeds and the other is rejected for reaching the seat cap

#### Scenario: No active subscription skips seat enforcement

- **WHEN** an org has no active team subscription and an invitation is created
- **THEN** the seat check is skipped rather than blocking the invitation

### Requirement: Deleting an org cascades and cancels billing

`DELETE /api/v1/orgs/{org_id}/` SHALL require the caller to be the `owner`. It SHALL cancel any active team Stripe subscription immediately (no refund), cancel the org's pending invitations, and hard-delete the org together with its memberships. It SHALL hard-delete a member's user account only when that org was the user's sole membership and the user has no active personal subscription; users with another membership or an active personal subscription SHALL be preserved. If the deleting owner's only org was this one, their own account SHALL be deleted as part of the cascade.

#### Scenario: Owner deletes the org

- **WHEN** the `owner` issues `DELETE /api/v1/orgs/{org_id}/`
- **THEN** the response is `204`, the active team subscription is scheduled for cancellation, and the org, its memberships, and its pending invitations are removed

#### Scenario: Non-owner cannot delete the org

- **WHEN** an `admin` issues `DELETE /api/v1/orgs/{org_id}/`
- **THEN** the request is rejected because only the owner may delete the org

#### Scenario: Members active elsewhere survive deletion

- **WHEN** an org is deleted and one of its members also belongs to another org or holds an active personal subscription
- **THEN** that member's user account is preserved while the membership in the deleted org is removed
