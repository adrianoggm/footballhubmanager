# API Reference (v1)

Base path: `/api/v1`

API docs:

- Swagger UI: `http://127.0.0.1:8000/api/docs`
- ReDoc: `http://127.0.0.1:8000/api/redoc`

## Access Model

- Public: login/register and nationalities catalog.
- Authenticated user/admin with peña access: read flows (membership, seasons, standings, matches, insights).
- Admin-only: write/management flows (season lifecycle, roster, match write operations, invite token generation).

## Auth

- `POST /auth/login`
- `POST /auth/admin/login`
- `POST /auth/register`
- `POST /auth/admin/register`
- `POST /auth/logout`

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
