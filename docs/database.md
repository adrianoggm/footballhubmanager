# Database and SQL

## Source of Truth

- Versioned schema: `versioning/sql/versions/v1.sql`
- Local init schema: `versioning/sql/actual.sql`
- CI seed data: `versioning/sql/ci_seed.sql`

## Notes

- The table name is `football_match` (not `match`) to avoid SQL reserved keyword conflicts.

## Rebuild Local Database

```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d --build
```

## DB Credentials (default template)

From `backend/config/.template.env`:

- Database: `footballhub`
- User: `footballuser`
- Password: `footballpass`
- Root password: `rootpassword`
