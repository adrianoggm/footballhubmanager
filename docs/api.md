# API Reference (v1)

Base path: `/api/v1`

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
- `POST /penas/{pena_guid}/link-tokens`
- `POST /penas/link/consume`

## Pena Membership

- `GET /penas/{pena_guid}/players`
- `GET /penas/{pena_guid}/players/{player_guid}`
- `PATCH /penas/{pena_guid}/players/{player_guid}`
- `DELETE /penas/{pena_guid}/players/{player_guid}`
- `PATCH /penas/{pena_guid}/players/me`
- `DELETE /penas/{pena_guid}/players/me`
- `GET /players/me/penas/{pena_guid}`

## Seasons (Core Management)

- `GET /penas/{pena_guid}/seasons`
- `GET /penas/{pena_guid}/seasons/active`
- `GET /penas/{pena_guid}/seasons/{season_guid}`
- `POST /penas/{pena_guid}/seasons`
- `PATCH /penas/{pena_guid}/seasons/{season_guid}`
- `DELETE /penas/{pena_guid}/seasons/{season_guid}`

## Seasons (Competition)

- `POST /penas/{pena_guid}/seasons/{season_guid}/players`
- `PATCH /penas/{pena_guid}/seasons/{season_guid}/players/{player_guid}`
- `GET /penas/{pena_guid}/seasons/{season_guid}/players`
- `POST /penas/{pena_guid}/seasons/{season_guid}/matches`
- `POST /penas/{pena_guid}/seasons/{season_guid}/matches/detailed`
- `PATCH /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/stats`
- `GET /penas/{pena_guid}/seasons/{season_guid}/matches`
- `GET /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}`
- `PATCH /penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/result`
- `GET /penas/{pena_guid}/seasons/{season_guid}/standings`

## Player Profiles

- `GET /players/me`
- `PUT /players/me`
- `GET /players/{player_guid}`

## Discoverable OpenAPI Docs

- Swagger UI: `http://127.0.0.1:8000/api/docs`
- ReDoc: `http://127.0.0.1:8000/api/redoc`
