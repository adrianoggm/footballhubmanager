# Database and SQL

## Source of Truth

- Versioned schema: `versioning/sql/versions/v1.sql`
- Local init schema: `versioning/sql/actual.sql`
- CI seed data: `versioning/sql/ci_seed.sql`

## Notes

- The table name is `football_match` (not `match`) to avoid SQL reserved keyword conflicts.
- Incremental changes live in `versioning/sql/versions/vN.sql` and are mirrored in `actual.sql`.
  An already-running database needs the new `vN.sql` applied by hand (or `just db-reset`).

## Account email and tokens (v13, #154)

- `admin_accounts` / `player_account`: `email varchar(254) null` (unique per table, stored
  trimmed + lowercase) and `email_verified_at bigint null` (epoch seconds; NULL = unverified).
  Nullable because accounts created before v13 have no email; registration requires it at the API.
- `account_token`: single-use tokens for email verification and password reset.
  - `token_hash char(64)` primary key: sha256 of the token. The raw token is never stored.
  - `purpose`: `EMAIL_VERIFICATION` | `PASSWORD_RESET`.
  - `account_type` (`user` | `admin`) + `account_id`: no foreign key, since the id points to one
    of two tables depending on the type.
  - `email`: the address being verified (verification tokens only).
  - `expires_at`, `created_at`: epoch seconds. `created_at` also drives the per-account cooldown.
- `user_session` has an index on `(user_id, user_type)` so a password reset can revoke every
  session of an account.

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
