# Observability stack (metrics + logs) — design

**Date:** 2026-06-26
**Status:** approved-for-planning
**Scope:** Metrics + queryable logs for the backend, with local = production parity.

## Goal

One observability stack, identical in local and production, that gives:

- **Metrics**: active connections / in-flight requests, request rate, latency, plus
  a business metric for **active user sessions**.
- **Logs**: centralized and queryable from Grafana (LogQL).
- **Tests** that run against the same stack we ship.

Non-goals (deferred until something concrete hurts): distributed tracing (Tempo),
custom-authored dashboards under version control, alerting rules beyond defaults,
multi-backend / HA storage.

## Parity decision

Local runs a **k3d** cluster (k8s-in-Docker, single binary) and installs the **same
Helm releases** as production. No docker-compose monitoring path — that would be a
second config that drifts from prod and defeats the purpose. Local *is* prod.

The existing app `docker-compose.yml` (MySQL only) is untouched; developers who just
want the API keep using `just backend`. The observability stack lives in the cluster.

## Components (ranked by importance)

| # | Component | Role | Source |
|---|---|---|---|
| 1 | **Grafana** | Single pane: metric graphs + log Explore | bundled in kube-prometheus-stack |
| 2 | **Prometheus** | Metric storage + PromQL | kube-prometheus-stack |
| 3 | **Loki** | Log storage + LogQL ("grep with labels", cheap) | `grafana/loki` Helm chart |
| 4 | **Grafana Alloy** (or Promtail) | Ships pod stdout → Loki (DaemonSet) | bundled with the Loki chart |
| 5 | kube-state-metrics + node-exporter | Pod/node/cluster metrics | bundled in kube-prometheus-stack |
| — | Alertmanager | Alerts — **deferred**, ships disabled-by-default | bundled |

The three that carry the requirement: **Grafana + Prometheus + (Loki + Alloy)**.
Everything else is either bundled for free or deferred.

## App changes (the only code we write)

In [backend/src/main.py](../../../backend/src/main.py), where `app = FastAPI(...)` is built:

1. Add `prometheus-fastapi-instrumentator` to [backend/requirements.txt](../../../backend/requirements.txt).
2. Instrument + expose `/metrics` (~3 lines). Gives `http_requests_total`,
   `http_request_duration_seconds` (histogram), `http_requests_inprogress`
   (= active connections), and exception counters per handler — for free.
3. **Active sessions gauge** — one small custom metric. A `Gauge` set from the auth
   session store (the `auth/` module already tracks session tokens with
   `sessionTtlSeconds`). This is the "número de usuarios" signal. Implemented as a
   tiny collector that counts non-expired sessions at scrape time. ~15 lines, lives
   next to the auth infrastructure, no new dependency.

**Open item to confirm at implementation time (do not guess):** the app uses
`root_path="/api"` and the k8s probes hit `/api/`. The actual ASGI route for
`/metrics` (i.e. `/metrics` vs `/api/metrics` on the pod's port 8000) must be
verified by curling the running pod, and the scrape path set to match. Logs need no
app change — Alloy tails container stdout, which the app already writes via the
stdlib logging config in `main.py`.

## Kubernetes wiring (chart `footballhub`)

New template `deploy/helm/footballhub/templates/servicemonitor.yaml`, gated by a new
value `metrics.enabled` (**default `false`** so installs without the Prometheus
Operator CRDs don't break). When enabled it emits a `ServiceMonitor` selecting the
existing backend `Service` (already has a named `http` port) and scrapes the metrics
path confirmed above.

`values.yaml` gains:

```yaml
metrics:
  enabled: false   # set true once kube-prometheus-stack is installed in-cluster
  path: /metrics   # adjust if the app serves it under /api
  interval: 30s
```

The monitoring stack itself is **not** templated into the footballhub chart — it is
installed as separate Helm releases (`kube-prometheus-stack`, `loki`) in a
`monitoring` namespace, documented in [deploy/helm/README.md](../../../deploy/helm/README.md)
with exact `helm install` commands and pinned chart versions. Same commands run
against k3d locally and the prod cluster.

## Local setup (k3d)

Documented step list in `deploy/helm/README.md`:

1. `k3d cluster create footballhub` (one command).
2. Install the two monitoring releases (same commands as prod).
3. Install/upgrade the `footballhub` chart with `metrics.enabled=true`.
4. `kubectl port-forward` Grafana → open `localhost:3000`, Explore → Loki for logs,
   dashboards for metrics.

Dashboards: import community dashboards by ID on first use (FastAPI = `14282`; k8s
dashboards ship with kube-prometheus-stack). *No hand-authored dashboard JSON until
we re-import often enough to feel the pain.*

## Tests

- **Unit (always, no cluster):** a pytest using FastAPI `TestClient` that GETs the
  metrics endpoint and asserts `http_requests_total` and the active-sessions gauge
  name are present in the output. Fails loudly if instrumentation regresses.
- **Integration (k3d, optional):** a smoke script querying the Prometheus HTTP API
  for `up == 1` on the backend target and Loki for recent backend log lines.
  Possible *only because* local = prod. Lives under `tests/integration`, skipped
  when no cluster is reachable (same pattern as the existing integration tests).

## Out of scope / explicitly skipped

Tracing, version-controlled dashboards, custom alerting, log retention tuning,
docker-compose monitoring. Each is added when a concrete need appears, not before.
