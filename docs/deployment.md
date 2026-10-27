# Deployment & image generation

Target: **Kubernetes** (future scaling). Registry: **GHCR**. Images are built and
published on a **semver tag** (`vX.Y.Z`).

## Flow overview

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant GH as GitHub Actions
    participant GHCR
    actor Ops as Operator
    participant Helm
    participant Job as Migrate Job
    participant DB as MySQL
    participant API as Backend

    Dev->>GH: git push tag vX.Y.Z
    GH->>GHCR: build & push backend + frontend images
    Ops->>Helm: helm upgrade --install (image.tag=X.Y.Z)
    Helm->>Job: pre-upgrade hook, run "migrate"
    Job->>DB: wait for DB, apply pending vN.sql
    DB-->>Job: schema at head
    Job-->>Helm: success (rollout blocked if it fails)
    Helm->>API: roll out backend + frontend
    API->>DB: startup check (STRICT): any pending?
    API-->>Ops: serving via Ingress (/api to backend, / to frontend)
```

The migration Job runs **before** the API rolls out and Helm blocks the release
until it succeeds, so the backend never serves against a stale schema (and refuses
to boot if it somehow would).

## Images

`./.github/workflows/release.yml` builds and pushes two images when you push a tag:

```bash
git tag v1.2.0
git push origin v1.2.0
```

| Image | Build context | Dockerfile |
|-------|---------------|------------|
| `ghcr.io/adrianoggm/footballhubmanager-backend` | repo root | `backend/docker/Dockerfile` |
| `ghcr.io/adrianoggm/footballhubmanager-frontend` | `frontend/` | `frontend/Dockerfile` |

Tags produced per release: `{{version}}` (e.g. `1.2.0`), `{{major}}.{{minor}}` (`1.2`),
`sha-<gitsha>`, and `latest`.

- **Backend** is built from the **repository root** so the image bundles both the
  app code (`backend/src`) and the SQL migrations (`versioning/sql`) the runner
  applies. It is a single image with multiple roles via its entrypoint:
  `serve` (default), `migrate`, `stamp [N]`, `rollback N`, `status`.
- **Frontend** is a static SPA served by nginx on `:8080`. It is backend-agnostic;
  the Ingress routes `/api` to the backend Service and everything else to the
  frontend (the SPA calls `/api/v1/...` relative to its own origin).

## Database migrations (the production flow)

There is **no Alembic**. The schema is a series of `versioning/sql/versions/vN.sql`
files, each optionally paired with a `vN.down.sql` that reverts it (mandatory from
v13 on). The runner (`backend/src/db_migrations`) tracks applied versions in
`schema_migrations` (version, description, success, applied_at, checksum, error) and
applies only the pending ones.

> The MySQL docker-entrypoint init (`actual.sql`) **only runs on an empty data
> volume**, so it cannot evolve a database that already holds production data.
> Production always evolves through the **runner**, never through the init script.

```mermaid
flowchart TD
    Start([Deploy a release]) --> Q{"Database already<br/>has data?"}
    Q -->|No / fresh DB| M["migrate: apply v1..vN in order"]
    Q -->|Yes, first time on the runner| S["stamp once: baseline to head"]
    S --> L[Later releases run migrate]
    M --> T[("schema_migrations<br/>updated")]
    L --> T
    T --> G{"Backend startup:<br/>pending migrations?"}
    G -->|None| OK[API serves traffic]
    G -->|Pending and STRICT| Fail[Fail fast at boot]
```

### Commands (image entrypoint, or `just` locally)

| Action | In a container | Locally |
|--------|----------------|---------|
| Show applied/pending/drifted/failed | `status` | `just db-status` |
| Apply pending | `migrate` | `just db-migrate` |
| Baseline existing DB | `stamp [N]` | `just db-stamp [N]` |
| Revert everything newer than vN | `rollback N` | `just db-rollback N` |

`rollback` has no default target on purpose: you always name the version to go back to.

### Backup before migrate

**Production must be backed up before every `migrate`.** The Helm migrate Job does
it for you: a `backup-db` initContainer runs `mysqldump --single-transaction` into
`/backups/<db>-<UTC timestamp>.sql` before the `migrate` container starts, and a
failed dump fails the Job, so the schema is never touched without a fresh dump.

- Point `migrations.backup.existingClaim` at a PVC you created once
  (`kubectl apply` a `PersistentVolumeClaim`, e.g. `footballhub-db-backups`). Without
  it the dump lands in an `emptyDir` and is **discarded with the pod**.
- Old dumps are not pruned automatically; clean the volume from time to time.
- Restore: `mysql -h <host> -u <user> -p <db> < <dump>.sql`.
- Outside Helm (manual runs), take a `mysqldump` or a provider snapshot yourself first.

### Rolling back (`vN.down.sql`)

`rollback N` reverts every **applied** version greater than `N`, newest first:

1. **Precheck, all-or-nothing.** If any of those versions has no `vN.down.sql` (or
   its `vN.sql` is gone), it prints which ones and executes **nothing**.
2. Each down file then runs in its own transaction together with the deletion of its
   `schema_migrations` row. The run stops at the first failing down and re-raises;
   versions already reverted stay reverted.
3. `rollback 0` is allowed only if every applied version has a down file (v1–v12
   predate the rule and have none, so in practice you can roll back to v12 at most).

Rolled-back versions are pending again; the next `migrate` re-applies them.

> **Data loss warning.** A down file that drops a column or a table destroys the
> data in it. Rollback restores the *schema*, not the data: restore from the
> pre-migrate dump if you need the data back.

> **MySQL DDL is not transactional.** MySQL auto-commits every DDL statement, so a
> migration (or a down) that fails halfway is **not atomic**: the statements before
> the failure stay applied. Inspect the schema and undo/finish by hand before
> retrying.

**Prefer expand/contract over rollbacks.** Write migrations so the *previous* app
image still works on the *new* schema: add nullable columns / new tables first
(expand), ship the code that uses them, and only drop the old things in a later
release (contract). Then an app rollback is just redeploying the previous image, and
a DB rollback is rarely needed.

### Checksums and drift

`migrate` and `stamp` store the sha256 of each applied `vN.sql` in
`schema_migrations.checksum` (CRLF normalized to LF first, so Windows and Linux
checkouts hash the same). The runner adds the `checksum`/`error` columns to an
existing table on its own (`ALTER TABLE ... ADD COLUMN`).

- Rows applied before checksums existed have `checksum = NULL`. They are **not**
  reported; the next `migrate`/`stamp` backfills them from the current files.
- `status` flags as **drift** (`[!]`) any applied version whose file no longer
  matches the stored checksum, i.e. someone edited an applied migration.
- The backend startup check treats drift like pending migrations: a warning, or a
  refusal to boot when `STRICT_MIGRATION_CHECK` is on.
- Fix: restore the original file and put the change in a new `vN.sql`. Never edit a
  migration that has already run anywhere.

### Failed migrations

When a migration fails, its transaction rolls back and the runner then records, in
a fresh transaction, a row with `success = 0` and the (truncated) error, and
re-raises. `status` shows it as `[F]` with the error.

- Only `success = 1` rows count as applied, so a failed version stays **pending**
  (the startup check sees it as pending too).
- **Retry rule:** fix the cause, then run `migrate` again. It retries the failed
  version and, on success, replaces the failed row with a normal one. On MySQL
  first undo/finish any DDL that did commit (see the warning above).
- If you completed the change by hand instead, `stamp N` marks it applied.

### First rollout against an EXISTING production database

The current prod DB already has data and a schema (created from `actual.sql` and/or
manual `vN.sql`). Running `migrate` blindly would try to re-apply versions that are
physically present and fail. Do this **once**:

1. Back up the database (snapshot / `mysqldump`; the Helm Job does this when
   `migrations.backup` is enabled).
2. Baseline it so the runner knows what is already there:
   - If the schema matches the current head, `stamp` everything: `stamp`.
   - If it is at an older point, cap it: `stamp 9` (marks v1–v9 applied).
3. From then on, every deploy runs `migrate`, which applies only newer versions.

### Fresh database (new environment, CI, dev)

Either works:
- Let the runner build it from scratch: `migrate` applies `v1..vN` in order
  (`v1.sql` is the full base schema), **or**
- Use the fast init (`actual.sql` on an empty volume) and then `stamp` so the
  runner is in sync.

### Authoring a new migration

1. Add `versioning/sql/versions/vN.sql` (next number) with the `ALTER`/`CREATE`.
2. Add `versioning/sql/versions/vN.down.sql` that reverts exactly that change
   (**mandatory from v13 on**; a unit test fails otherwise). Test the round trip
   locally: `just db-migrate`, `just db-rollback <N-1>`, `just db-migrate`.
3. Add the same change to `versioning/sql/actual.sql` (keeps the fast-init/dev path
   current) and add `('N', '<description>', 1)` to its `schema_migrations` insert.
4. Update the relevant SQLAlchemy entity.
5. Never edit a `vN.sql` once it has been applied anywhere: `status` reports it as
   checksum drift. Put follow-up changes in a new version.
6. Do **not** self-insert into `schema_migrations` in new files — the runner records
   each applied version (older files v1–v8 self-record; the runner upserts idempotently).
7. Prefer expand/contract (see above) and idempotent DDL where practical. Note: MySQL auto-commits per DDL statement,
   so a multi-statement migration that fails midway cannot be fully rolled back —
   fix forward.

## Kubernetes wiring (next increment)

Run the migration as a **one-shot Job that completes before the API serves traffic**,
using the backend image with args `["migrate"]`:

- **Helm:** a Job annotated as a `pre-install,pre-upgrade` hook (recommended) — Helm
  blocks the rollout until it succeeds.
- **Plain manifests:** a `Job` gated by your deploy tooling, or an `initContainer` on
  the backend Deployment that runs `migrate` before the `serve` container starts.

The backend Deployment runs the default `serve`; the frontend Deployment serves nginx;
an Ingress maps `/api` → backend Service and `/` → frontend Service.

> The Helm chart (Deployments, Services, Ingress, the migrate hook Job, Secrets/Config)
> is the next step and depends on where MySQL lives (managed vs in-cluster).

## HTTPS / TLS

> For an end-to-end, copy-paste runbook on a single cheap VPS (k3s + ingress-nginx +
> cert-manager + this chart), see [vps-deployment.md](vps-deployment.md).

TLS terminates **at the Ingress**. Backend and frontend stay plain HTTP inside the
cluster (backend on `:8000`, nginx on `:8080`); only the ingress speaks HTTPS to the
internet. The pieces that make this work:

- **Backend trusts the proxy.** uvicorn runs with `proxy_headers=True` and
  `forwarded_allow_ips` (override via `FORWARDED_ALLOW_IPS`, default `*`). It reads
  `X-Forwarded-Proto`/`-For` from the ingress, so `request.url.scheme` is `https` and
  Swagger/redoc and any generated URLs use the right scheme. `*` is safe here because
  the only thing that can reach the pod is the in-cluster ingress.
- **Frontend uses a relative API base** (`VITE_API_BASE_URL` defaults to `""`), so the
  SPA calls `/api/...` on its own origin and automatically inherits `https://`. No
  mixed content, and the PWA service worker (which *requires* HTTPS in production) works.
- **Auth is Bearer-token, not cookies** — there are no `Secure`/`SameSite` cookie flags
  to set.

### Enable TLS with cert-manager (recommended)

Requires [cert-manager](https://cert-manager.io/) installed and a `ClusterIssuer`
(e.g. `letsencrypt-prod`). The chart adds the `cert-manager.io/cluster-issuer`
annotation; cert-manager issues and renews the cert into `ingress.tls.secretName`.

```yaml
# values-prod.yaml (excerpt)
ingress:
  enabled: true
  className: nginx
  host: app.example.com
  tls:
    enabled: true
    secretName: footballhub-tls
    clusterIssuer: letsencrypt-prod
  forceHttpsRedirect: true   # turn on AFTER the cert is issued (avoids redirect loop)
  hsts:
    enabled: true            # turn on once HTTPS is stable

app:
  env: production
  allowedHosts: "app.example.com"
  corsAllowedOrigins: "https://app.example.com"
```

```bash
helm upgrade --install footballhub ./deploy/helm/footballhub -f values-prod.yaml
```

Bring TLS up in two steps to avoid locking yourself out while the cert is pending:
first deploy with `tls.enabled=true` but `forceHttpsRedirect=false`; once
`kubectl get certificate` shows `Ready=True`, enable `forceHttpsRedirect` (and `hsts`).

### Enable TLS with a pre-provisioned certificate

Skip `clusterIssuer` and create the secret yourself (corporate CA, wildcard, etc.):

```bash
kubectl create secret tls footballhub-tls --cert=tls.crt --key=tls.key
helm upgrade --install footballhub ./deploy/helm/footballhub \
  --set ingress.tls.enabled=true --set ingress.host=app.example.com
```

> The redirect/HSTS annotations are written in the `nginx.ingress.kubernetes.io/*`
> form. On a different ingress controller, set the equivalent via `ingress.annotations`
> and leave `forceHttpsRedirect`/`hsts` off.
