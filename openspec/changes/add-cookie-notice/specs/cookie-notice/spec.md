## ADDED Requirements

### Requirement: Configuration-gated rendering

The cookie notice SHALL be controlled by a single build-time flag `NEXT_PUBLIC_COOKIE_BANNER`. When the flag is truthy the notice is eligible to render; when the flag is unset or falsy the notice SHALL NOT render and SHALL add no markup, script, or bytes attributable to it. The repository configuration template SHALL ship this flag enabled by default.

#### Scenario: Flag enabled shows the notice

- **WHEN** a first-time visitor loads a public page and `NEXT_PUBLIC_COOKIE_BANNER` is truthy
- **THEN** the cookie notice is rendered

#### Scenario: Flag disabled renders nothing

- **WHEN** the application is built with `NEXT_PUBLIC_COOKIE_BANNER` unset or falsy
- **THEN** no cookie notice renders on any route
- **AND** no notice-specific markup or script is present in the page

#### Scenario: Template default is enabled

- **WHEN** a developer copies `.env.example` without editing it
- **THEN** `NEXT_PUBLIC_COOKIE_BANNER` is enabled

### Requirement: Informational content, no gating

The notice SHALL be purely informational: it SHALL state that the site uses strictly-necessary cookies and SHALL link to the existing cookie policy page (`/cookies`). It SHALL NOT block, defer, or conditionally load any cookie or script, and SHALL NOT present per-category consent controls (no accept/reject/manage choices). All user-facing text SHALL be supplied through the i18n system in every supported locale.

#### Scenario: Notice states purpose and links to policy

- **WHEN** the notice is displayed
- **THEN** it communicates that only strictly-necessary cookies are used
- **AND** it provides a link to the `/cookies` policy page

#### Scenario: Notice gates nothing

- **WHEN** the notice is displayed and not yet dismissed
- **THEN** every cookie and script the application would otherwise set is still set
- **AND** the notice offers no per-category opt-in or opt-out controls

#### Scenario: Copy is localized

- **WHEN** the notice renders under any supported locale
- **THEN** its text is resolved from that locale's messages, not a hardcoded string

### Requirement: Dismissal persistence without a new cookie

The notice SHALL be dismissible. Once dismissed, it SHALL stay dismissed across navigation and page reloads within the same browser. Dismissal state SHALL be stored in `localStorage` and SHALL NOT introduce any new cookie.

#### Scenario: Dismissal survives reload

- **WHEN** a visitor dismisses the notice and then reloads or navigates within the site
- **THEN** the notice does not reappear

#### Scenario: Dismissal sets no cookie

- **WHEN** a visitor dismisses the notice
- **THEN** dismissal is recorded in `localStorage`
- **AND** no new cookie is created as a result
