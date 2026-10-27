# API Reference (v1)

Base path: `/api/v1`

API docs:

- Swagger UI: `http://127.0.0.1:8000/api/docs`
- ReDoc: `http://127.0.0.1:8000/api/redoc`

## Access Model

- Public: login/register, email verification, password recovery and nationalities catalog.
- Authenticated user/admin with peña access: read flows (membership, seasons, standings, matches, insights).
- Admin-only: write/management flows (season lifecycle, roster, match write operations, invite token generation).

## Auth

- `POST /auth/login`
- `POST /auth/admin/login`
- `POST /auth/register`
- `POST /auth/admin/register`
- `POST /auth/logout`
- `GET /auth/session` (includes `email` and `email_verified`)

Registration (user and admin) requires `email` and accepts an optional `lang` (`es` default,
or `en`) for the verification email it sends.

### Account email and password recovery (#154)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/auth/me/email` | session | `{email, email_verified}` |
| `PUT` | `/auth/me/email` | session | `{email, lang}`. Stores it unverified and emails a verification link. 409 if another account of the same type uses it, 429 inside the cooldown |
| `POST` | `/auth/me/email/verification` | session | `{lang}`. Resends the link (202). 409 if there is no email or it is already verified, 429 inside the cooldown |
| `POST` | `/auth/email/verify` | public | `{token}`. 400 invalid/used, 410 expired. Only verifies if the account email still matches the one the link was sent to |
| `POST` | `/auth/password/forgot` | public | `{email, lang}`. Always 202 with the same body. Emails one reset link per account type whose **verified** email matches |
| `POST` | `/auth/password/reset/inspect` | public | `{token}` -> `{username, account_type, expires_at}`. 400 invalid/used, 410 expired. POST so the token stays out of access logs |
| `POST` | `/auth/password/reset` | public | `{token, new_password}` (min 12 chars). Single use. Revokes every session of the account; no auto-login |

Security notes:

- Tokens are `secrets.token_urlsafe(32)`; only their sha256 is stored (`account_token`).
- A new reset or verification link replaces the previous ones of the same kind for that account.
- One email of each kind per account every `ACCOUNT_EMAIL_COOLDOWN_SECONDS` (default 60). The
  forgot-password endpoint applies it silently; the authenticated endpoints answer 429.
- Forgot-password never reveals whether an address exists: same status and body, and delivery
  runs in a background thread so timing does not tell either.
- Emails are normalized (trimmed, lowercase) and unique within each account table. The same
  address may belong to one user account and one admin account.
- Mail backend: `MAIL_BACKEND=console` (logs the email, dev only) or `smtp` (`SMTP_*`). Links
  point to `APP_PUBLIC_URL`. TTLs: `PASSWORD_RESET_TOKEN_TTL_SECONDS` (3600),
  `EMAIL_VERIFICATION_TOKEN_TTL_SECONDS` (86400).

## Catalogs

- `GET /catalogs/nationalities`

## Penas

- `GET /penas`
- `GET /penas/{pena_guid}`
- `POST /penas/{pena_guid}/link-tokens` (admin)
- `POST /penas/link/consume`

## Peña Membership

- `POST /penas/{pena_guid}/players` (admin)
- `GET /penas/{pena_guid}/players`
- `GET /penas/{pena_guid}/players/{player_guid}`
- `PATCH /penas/{pena_guid}/players/{player_guid}` (admin)
- `DELETE /penas/{pena_guid}/players/{player_guid}` (admin)
- `GET /players/me/penas/{pena_guid}`
- `PATCH /penas/{pena_guid}/players/me`
- `DELETE /penas/{pena_guid}/players/me`

## Seasons (Core)

- `GET /penas/{pena_guid}/seasons`
- `GET /penas/{pena_guid}/seasons/active`
- `GET /penas/{pena_guid}/seasons/{season_guid}`
- `POST /penas/{pena_guid}/seasons` (admin)
- `PATCH /penas/{pena_guid}/seasons/{season_guid}` (admin)
- `DELETE /penas/{pena_guid}/seasons/{season_guid}` (admin)

## Season Competition

### Season Roster

- `POST /penas/{pena_guid}/seasons/{season_guid}/players` (admin)
- `POST /penas/{pena_guid}/seasons/{season_guid}/players/bulk` (admin)
- `PATCH /penas/{pena_guid}/seasons/{season_guid}/players/{player_guid}` (admin)
- `DELETE /penas/{pena_guid}/seasons/{season_guid}/players/{player_guid}` (admin)
- `GET /penas/{pena_guid}/seasons/{season_guid}/players`

### Matches

- `POST /penas/{pena_guid}/seasons/{season_guid}/matches` (admin)
- `POST /penas/{pena_guid}/seasons/{season_guid}/matches/detailed` (admin)
- `PATCH /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}` (admin)
- `PATCH /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/lineups` (admin)
- `PATCH /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/stats` (admin)
- `PATCH /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/result` (admin)
- `GET /penas/{pena_guid}/seasons/{season_guid}/matches`
- `GET /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}`
- `DELETE /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}` (admin)

Live clock control (admin). Pausing freezes the clock (half-time, interruptions) without
finishing tracking; paused time never counts towards match/event time. `tracking_status`
values: `not_started` | `live` | `paused` | `finished`.

- `POST /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/start` (admin)
- `POST /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/pause` (admin)
- `POST /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/resume` (admin)
- `POST /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/stop` (admin, finishes tracking)

### Standings

- `GET /penas/{pena_guid}/seasons/{season_guid}/standings`

### Match Insights

- `POST /penas/{pena_guid}/match-insights`

Insights support:

- selected season scope
- all seasons scope
- configurable matrix/top list sizes

## Player Profiles

- `GET /players/me`
- `PUT /players/me`
- `GET /players/{player_guid}`
