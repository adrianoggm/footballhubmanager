# Frontend Implementation Planning

This document captures the functional planning for the next frontend implementation phase, including information architecture, end-to-end flows, screen-level specs, reusable components, design tokens, responsive behavior, and UX handoff requirements.

## 1) Information Architecture (Role-Based Sitemap)

### Global (Shared)

- Auth Landing
  - Role toggle: Admin | User (Player)
- Login
- Register
- Session
  - Persistent session (remembered auth)
  - Logout
- Global error handling
  - API unreachable
  - Token expired

### Admin Sitemap

- Admin Home
  - Pena context + Active Season context
  - Quick links: Seasons, Invitations, Standings, Matches
- Admin Penas
  - List managed penas
  - Select pena (sets `current pena` context)
- Admin Seasons
  - List seasons for current pena
  - Create season
  - Edit season
  - Delete season
  - Set Active Season
- Admin Invitations
  - List invitation tokens (current pena)
  - Generate token
  - Optional list fields only if returned by API
  - No revoke option unless API supports it
- Admin Standings
  - Standings for current pena + selected season (default active season)
- V2 Admin
  - Admin Pena Members
  - Admin Season Roster
  - Admin Matches
  - Admin Match Detail

Admin navigation rule:
Nothing beyond managed pena selection should work without a `current pena` set.
If no `current pena` exists, redirect to Admin Penas.

### User Sitemap

- User Home
  - Summary: my penas + quick join
  - Shortcuts: My Profile, My Membership (per selected pena), Matches, Standings
- User My Profile
  - View/edit own player profile
- User Join Pena
  - Consume token -> join pena
- User My Penas
  - List penas where user belongs
  - Select pena (sets `current pena` context)
- User My Membership (current pena)
  - View/edit membership fields (nickname/position)
  - Leave pena
- User Seasons (current pena)
  - List seasons + highlight active
- User Players (current pena)
  - Roster list (season-scoped if API returns it that way; otherwise pena-scoped)
  - Player profile (only when allowed)
- User Matches (current pena)
  - Read-only list (MVP)
- User Match Detail (current pena)
  - Read-only (MVP basic result; V2 lineups/stats)
- User Standings (current pena)
  - Active-season standings
  - Season selector if API supports multiple seasons

User navigation rule:
Any pena-scoped screen requires membership.
If there is no `current pena`, route to User My Penas.

## 2) End-to-End User Flows (With Decision Points)

### Admin Flows

#### A1. Authenticate -> Land on Admin Home

1. Auth (Admin) -> Login/Register
2. Decision: success?
   - Yes -> Admin Home (if `current pena` exists) or Admin Penas (if not)
   - No -> inline error + retry
3. Decision: session expired on any screen?
   - Yes -> show `Session expired` dialog -> route to Auth

#### A2. Select Managed Pena

1. Admin Home -> `Switch Pena` (or first-time route to Admin Penas)
2. Admin Penas: select pena card
3. Set `current pena` context -> return to Admin Home
4. Decision: user is not admin / forbidden?
   - Show Forbidden state (no managed penas) with logout CTA

#### A3. Manage Seasons (CRUD + Set Active)

1. Admin Home -> Seasons
2. Seasons list
3. Create season (modal or dedicated form screen)
4. Edit season (inline or details page)
5. Delete season (confirmation)
6. Set active season (radio/select)

Decision points:
- If no seasons -> empty state with `Create Season`
- If setting active season fails -> toast + keep previous active season

#### A4. Generate Invitation Token

1. Admin Home -> Invitations
2. Invitations list
3. Generate token (primary CTA)
4. Success shows token value + copy action
5. Decision: generation fails -> error banner + retry

#### A5. Review Standings

1. Admin Home -> Standings
2. Default to active season (or prompt if none)
3. Season selector (if API supports season listing) -> refresh standings
4. Decision: no active season -> empty state (`Create season` or `Set active`)

### User Flows

#### U1. Authenticate -> Choose Pena Context

1. Auth (User) -> Login/Register
2. Success -> User Home
3. Decision: has at least one pena membership?
   - Yes -> show My Penas summary + last selected pena as current
   - No -> prompt Join Pena

#### U2. Join Pena via Token

1. User Home -> Join Pena
2. Paste token -> `Join`
3. On success:
   - set `current pena` context
   - route to User My Membership (set nickname/position)
4. Decision: token invalid/expired/consumed
   - Show inline error: `This invite token is invalid or has expired.`

#### U3. View/Edit Own Profile

1. User Home -> My Profile
2. View/edit fields supported by `/players/me`
3. Save -> success toast
4. Decision: validation errors -> field-level messages

#### U4. Edit Membership + Leave Pena

1. User Home or My Penas -> My Membership
2. Edit nickname/position -> Save
3. Leave Pena (destructive) -> confirm -> success -> route to My Penas
4. Decision: forbidden (no longer a member)
   - Show Forbidden state + back to My Penas

#### U5. Read-Only Matches + Standings (MVP)

With `current pena` selected:

1. Matches -> list -> match detail (read-only)
2. Standings -> active-season standings (read-only)
3. Decision: no seasons / no matches / no standings
   - Show empty-state messaging

## 3) Screen-by-Screen Figma Specs (Implementation-Ready)

Each screen includes:
- Purpose
- Entry points
- Layout
- Components
- Actions
- State variants
- Validation & feedback

API coverage should be respected as implementation boundary.

### AUTH (Shared Container, Role-Specific Copy)

#### Screen: Auth / Admin Login-Register

- Purpose: Admin authentication via `/auth/*`
- Entry points: app root, session expired, logout
- Layout: centered auth card, role chip = Admin (locked within admin route)

Components:
- Tabs: Login | Register
- Inputs: Email, Password (+ Confirm Password on register)
- `Remember session` checkbox (frontend persistence behavior)
- Primary button: Login / Create account
- Secondary: Switch to User Auth

Actions:
- Primary submit with spinner
- Secondary switches role route

States:
- Loading: inputs disabled + button progress
- Error: inline alert (`Invalid credentials`, etc.)

Validation and feedback:
- Email required / format
- Password required / min length (if enforced client-side)
- Generic network error (`Couldn’t reach server. Check connection and retry.`)

#### Screen: Auth / User Login-Register

Same structure as admin auth, with player-oriented copy.

### ADMIN SCREENS

#### Screen: Admin Home (MVP)

- Purpose: command center for current pena and active season
- Entry points: post-login, pena selection, navigation

Layout (desktop):
- Left nav rail: Home, Penas, Seasons, Invitations, Standings
- V2 nav additions: Members, Roster, Matches
- Top app bar: current pena selector, active season badge, user menu (logout)
- Main: two-column card grid

Main sections:
- Current Pena Summary card
- Active Season card
- Invitations card
- Standings Snapshot card

Required components:
- Pena selector (dropdown/modal)
- Season badge + selector shortcut
- Reusable cards + skeletons + empty placeholders

Actions:
- Hub navigation to feature screens

States:
- Loading: skeleton cards; disable data-dependent links
- Empty: no current pena selected
- Error: failed pena context load + Retry
- Forbidden: no admin access + Logout

Feedback:
- Toast on pena switch

#### Screen: Admin Penas (MVP)

- Purpose: select managed pena
- Entry points: Admin Home `Switch Pena`, first-time admin login

Layout:
- Header + search input
- Grid/list of pena cards

Components:
- Pena card (name, short id, optional `Current` badge)
- Select action

States:
- Loading skeleton
- Empty: no available penas
- Error + retry
- Forbidden

Feedback:
- Selection toast

#### Screen: Admin Seasons (MVP)

- Purpose: season management for current pena via `/penas/{pena_guid}/seasons*`
- Entry points: Admin Home, nav

Layout:
- Header + `Create Season`
- Season table (cards on mobile)
- Optional detail drawer for edit

Components:
- Columns: Name, Date range, Status, Actions
- Set Active control (radio or menu action)
- Create/Edit form with required name and optional dates

Actions:
- Primary: Create / Save
- Secondary: Set Active / Cancel
- Destructive: Delete + confirm

States:
- Loading
- Empty + create CTA
- Error + retry
- Forbidden

Validation and feedback:
- Name required
- Success toasts
- Failure toasts for delete/update issues

#### Screen: Admin Invitations (MVP)

- Purpose: generate/list invite tokens via `/penas/{pena_guid}/link-tokens`
- Entry points: Admin Home card, nav

Layout:
- Header + `Generate token`
- Token list table

Components:
- Token row: masked token, created date/status if API provides
- Copy-to-clipboard action
- Generate token confirm dialog

Actions:
- Primary: generate token
- Secondary: copy token

States:
- Loading
- Empty + generate CTA
- Error + retry
- Forbidden

Validation and feedback:
- `Token copied` toast
- `Token generation failed. Retry.` error

Note:
Do not design revoke action unless API supports it.

#### Screen: Admin Standings (MVP)

- Purpose: standings review via `/standings` + seasons list endpoint
- Entry points: Admin Home card, nav

Layout:
- Header
- Filters row (season selector + refresh)
- Standings table
- Optional trend panel only if payload supports it

Components:
- Selector populated from seasons endpoint
- Table fields only from API response (Position, Player, Played, W/D/L, GF/GA, Points, etc.)

Actions:
- Refresh
- Change season

States:
- Loading
- Empty
- Error + retry
- Forbidden

### V2 ADMIN SCREENS (Defined Now, Marked as V2 in Figma)

#### Screen: Admin Pena Members (V2)

- Purpose: manage members via `/penas/{pena_guid}/players*`
- If no admin edit/remove endpoint exists, keep listing read-only

Layout:
- Member table
- Optional edit modal and remove confirmation only when API supports mutations

#### Screen: Admin Season Roster (V2)

- Purpose: season roster via `/penas/{pena_guid}/seasons/{season_guid}/players*`

Layout:
- Season selector
- Roster list
- Add single player
- Bulk add only if API explicitly supports bulk

#### Screen: Admin Matches + Admin Match Detail (V2)

- Purpose: manage matches via `/matches*`
- MVP boundary: read-only or minimal create
- V2: lineups/stats/result editing only if payload supports it

### USER SCREENS

#### Screen: User Home (MVP)

- Purpose: hub for my penas, quick join, and shortcuts
- Entry points: post-login, nav

Layout:
- Top bar: current pena selector (if multiple), user menu
- Cards: My Penas summary, Join Pena CTA, My Membership, Matches, Standings
- Membership/matches/standings cards only when current pena is selected

States:
- Loading
- Empty (no penas -> join prompt)
- Error + retry
- Forbidden (role mismatch)

#### Screen: User My Profile (MVP)

- Purpose: view/edit own profile via `/players/me`
- Optional nationality via `/catalogs/nationalities`
- Entry points: User Home, nav

Layout:
- Single-column form
- Avatar placeholder (no upload unless API supports it)
- Sticky save button on mobile

Actions:
- Save
- Cancel/revert

States:
- Loading
- Empty (rare profile missing case)
- Error + retry
- Forbidden (not authenticated)

Validation and feedback:
- Required fields only if server requires
- Success toast

#### Screen: User Join Pena (MVP)

- Purpose: consume invite token via `/penas/link/consume`
- Entry points: User Home, nav

Layout:
- Token input card with helper text and join action

Actions:
- Primary: Join
- Secondary: Back to Home

States:
- Loading
- Error + retry
- Forbidden (already member message + link to My Penas)

Validation and feedback:
- Token required
- Examples:
  - `Token is invalid or expired.`
  - `You’re already a member of this pena.`

#### Screen: User My Penas (MVP)

- Purpose: list memberships and set `current pena`
- Entry points: User Home card, nav

Layout:
- Grid/list of pena cards

Components:
- Pena card with `Current` badge
- Select action

States:
- Loading
- Empty + join CTA
- Error + retry

Feedback:
- Selection toast

#### Screen: User My Membership (MVP)

- Purpose: edit membership fields and leave pena
- Endpoints: `/players/me/penas/{pena_guid}` and/or `/penas/{pena_guid}/players*`
- Entry points: User Home, My Penas, nav

Layout:
- Header with pena name
- Membership form
- Danger zone: Leave Pena

Components:
- Fields: Nickname, Position (if membership-scoped)
- Save button
- Leave button with confirmation dialog

Actions:
- Save
- Leave (destructive)

States:
- Loading
- Empty (membership missing -> reselect pena)
- Error + retry
- Forbidden (not member -> back to My Penas)

Validation and feedback:
- Nickname max length (UI limit + server validation)
- `Membership updated` toast
- `You left the pena` toast

#### Screen: User Seasons (MVP Read)

- Purpose: view seasons for current pena
- Endpoint: `/penas/{pena_guid}/seasons*`
- Layout: season cards/list, active season highlighted
- States: loading, empty, error, forbidden

#### Screen: User Players (V2 Read, MVP Optional)

- Purpose: view pena or season roster
- Endpoints: `/penas/{pena_guid}/players*` or `/penas/{pena_guid}/seasons/{season_guid}/players*`
- Layout: searchable roster list
- Profile open behavior: only if role/API allows

#### Screen: User Matches (MVP Read)

- Purpose: read-only match list via `/matches*`
- Entry points: nav, User Home shortcut

Layout:
- Filters: season (default active), optional Played/Upcoming if supported
- Match cards/list with date, opponents, score (if available)

Actions:
- Open Match Detail
- Refresh

States:
- Loading
- Empty
- Error + retry
- Forbidden

#### Screen: User Match Detail (MVP Read)

- Purpose: show match summary and result
- V2: lineups and stats if payload supports

Layout:
- Header: teams, date, score
- Sections: result summary, optional V2 blocks

States:
- Loading, empty, error, forbidden

#### Screen: User Standings (MVP Read)

- Purpose: read-only standings via `/standings`
- Layout: season selector + standings table
- States: loading, empty, error, forbidden

## 4) Reusable Component Library Proposal

### Shared (Admin + User)

- App Shell
  - Top App Bar (title, current pena selector, user menu)
  - Side Nav (role-specific items)
- State Patterns
  - Page skeleton loader
  - Empty state component (icon + title + body + CTA)
  - Error banner (message + Retry)
  - Forbidden panel (message + Back/Logout CTA)
- Forms
  - Text input, password input, select
  - Form footer (Primary/Secondary)
  - Inline validation + helper text
- Data Display
  - Table, card list, search field
  - Chip/badge (`Active`, `Current`)
- Dialogs
  - Destructive confirmation
  - Simple modal (create/edit)
- Utilities
  - Toast/snackbar
  - Copy-to-clipboard action

### Admin-Specific

- Set Active Season control pattern
- Token reveal/mask row pattern
- Row action menu (kebab)

### User-Specific

- Join Pena token entry card
- Danger zone section for Leave Pena

## 5) Design Token Direction (Figma + MUI Alignment)

### Typography Scale

- Display: 32/40
- H1: 24/32
- H2: 20/28
- H3: 16/24
- Body: 14/20
- Caption: 12/16
- Button: 14/16 (medium weight)

### Spacing (8pt)

- 4, 8, 16, 24, 32, 48

Page padding:
- Desktop: 24
- Tablet: 16-24
- Mobile: 16

### Color Semantics

- Primary: key actions (Login, Save, Create, Generate)
- Secondary: lower-emphasis actions/navigation
- Success: saved/joined/created
- Warning: missing active season, token warning (if API indicates)
- Error: failures/validation
- Info: neutral hints
- Surface: background/cards/elevated containers
- Text: primary/secondary/disabled

Status colors must be clearly distinct and accessible.
Forbidden state should use Error semantics with neutral explanatory copy.

## 6) Responsive Behavior (Desktop/Tablet/Mobile)

### Auth

- Desktop: centered card, max width ~420-480
- Tablet/Mobile: full-width card with comfortable padding
- Avoid side-by-side fields on smaller screens

### Admin Home / User Home

- Desktop: 2-column grid (3 on very wide screens)
- Tablet: 1-2 columns with larger cards
- Mobile: single column, sticky top bar, visible key CTAs

### Seasons / Standings / Invitations

- Desktop: full table with sticky header
- Tablet: horizontal scroll or card-row fallback
- Mobile: card rows by default, actions in overflow menu

### Join Pena / My Membership

- Desktop: centered form max width ~640
- Mobile: full-width with sticky Save action

### Matches

- Desktop: list + filters row
- Mobile: filters collapse into sheet/modal, tappable match cards

## 7) Handoff Checklist (UX -> High-Fidelity Figma)

- Figma page list matches sitemap (Admin and User separated)
- Every screen includes variants:
  - Default
  - Loading
  - Empty
  - Error (+ Retry)
  - Forbidden
  - Destructive confirmation
- Components are built as reusable Figma components
- `Current Pena` context pattern is explicit:
  - selector
  - missing-context prompt
- Form validation rules documented per field (required, max length, format)
- Feedback rules are explicit:
  - Toast for success
  - Banner for blocking load errors
- Navigation guards are documented (role + membership)
- API mapping is annotated per frame (no unsupported features)
- Responsive frames included for MVP:
  - Desktop 1440
  - Tablet 768
  - Mobile 375
- Copy is final and consistent (English strings, errors, labels)
- Accessibility pass completed:
  - contrast
  - focus states
  - touch targets >= 44px on mobile
- Empty states never expose unsupported actions (example: no revoke token if API does not support revoke)
