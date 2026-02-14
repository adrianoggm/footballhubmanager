# Docker Guide

## Compose Files

- Local DB stack: `docker/docker-compose.yml`
- CI stack (DB + backend + seed): `docker/docker-compose.ci.yml`

## Local Environment

From `docker/`:

```bash
docker compose up -d
```

This starts:

- `mysql` (MySQL 8)
- Port mapping: `3306:3306`
- Schema initialization from `versioning/sql/actual.sql`

Stop services:

```bash
docker compose down
```

Reset DB volume:

```bash
docker compose down -v
docker compose up -d
```

## CI-like Environment

```bash
cd docker
docker compose -f docker-compose.ci.yml up -d --build
```

This starts:

- `mysql` with schema + CI seed
- `backend` connected to containerized MySQL

Shutdown:

```bash
docker compose -f docker-compose.ci.yml down -v
```

## Common Issue

If you see warnings such as `MYSQL_ROOT_PASSWORD variable is not set`, ensure `backend/config/.env` exists before `docker compose up`.
