# PenaHub

This repo uses a hexagonal architecture (ports and adapters). The goal is to keep
domain and application logic independent from frameworks and infrastructure.

## Architecture (hexagonal)
- Domain: pure business models (entities) and rules.
  - Current entities live in `backend/src/persistence/domain/entity`.
- Application (use cases): orchestrates domain + ports.
  - Use cases live in `backend/src/persistence/application/use_cases`.
- Infrastructure: adapters to DB, external services, etc.
  - `backend/src/persistence/infrastructure`.
- Interface / delivery: HTTP controllers and API routes.
  - `backend/src/api/interface/controller/v1`.

Keep controllers thin: validate input, call a use case, return DTOs.
No direct DB access from controllers.

## GUIDs (external references)
All tables have a `guid` column (CHAR(36), unique) and every ORM entity includes
`GuidMixin`. The `guid` is the only identifier that should be exposed outside
the service (API params, responses, logs).

Rules:
- Do NOT expose internal numeric `id` in API responses.
- API routes should accept GUIDs (e.g. `/v1/penas/{pena_guid}`).
- Use `id` only for internal joins; filter by `guid` when input comes from API.
- Create new rows using DB default `UUID()` or Python `uuid4()`.

## Database / migrations
- Source of truth: `versioning/sql/versions/v1.sql`
- Init script used by Docker: `versioning/sql/actual.sql`
- Table `football_match` replaces the reserved word `match`.

To rebuild DB:
```
docker-compose -f docker/docker-compose.yml down --volumes
docker-compose -f docker/docker-compose.yml up -d --build
```

## API example
Pena players endpoint (GUIDs only):
```
GET /api/v1/penas/{pena_guid}/players?page=1&page_size=20&search=juan
```

Response items contain `guid` (not `id`).
