# footballhub Helm chart

Deploys the backend API, the frontend SPA, an optional in-cluster MySQL, and runs
schema migrations as a pre-install/pre-upgrade hook. See `../../docs/deployment.md`
for the migration model and `values.yaml` for all options.

> Not yet rendered locally (no `helm` in this environment). Validate before use:
> `helm lint deploy/helm/footballhub` and `helm template r deploy/helm/footballhub`.

## Quick start (dev, in-cluster MySQL)

First install must disable the migration hook (the MySQL StatefulSet is not up yet
when Helm runs pre-install hooks), then upgrade:

```bash
helm install fhm deploy/helm/footballhub \
  --set image.tag=1.2.0 \
  --set migrations.enabled=false
helm upgrade fhm deploy/helm/footballhub --set image.tag=1.2.0
```

## Production (external/managed MySQL)

```bash
# Store the DB password out-of-band:
kubectl create secret generic fhm-db --from-literal=DB_PASSWORD='********'

helm upgrade --install fhm deploy/helm/footballhub \
  --set image.tag=1.2.0 \
  --set mysql.enabled=false \
  --set externalDatabase.host=your-db-host \
  --set database.existingSecret=fhm-db \
  --set ingress.host=app.example.com
```

## First deploy against a database that already has data

Baseline it once (mark present versions applied, don't re-run them), then migrate
on later releases:

```bash
helm upgrade --install fhm deploy/helm/footballhub \
  --set image.tag=1.2.0 --set 'migrations.args={stamp}'
# subsequent releases use the default migrations.args = {migrate}
```

## Observability (metrics + logs)

One stack, **installed with the same commands locally and in production** — local is
just a k3d cluster. The footballhub chart only contributes a `ServiceMonitor`
(`metrics.enabled=true`); Prometheus, Grafana and Loki are separate Helm releases so
we operate the standard upstream charts instead of vendoring them.

The backend exposes Prometheus metrics at **`/api/metrics`** (HTTP rate/latency/
in-flight + `footballhub_active_sessions`). Logs are pod stdout, shipped to Loki by
the agent bundled with the Loki chart — no app change needed.

### 1. Local cluster (k3d) — skip in prod, you already have a cluster

```bash
k3d cluster create footballhub -p "8080:80@loadbalancer"
```

### 2. Install the monitoring stack (same in local and prod)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Metrics + Grafana + Alertmanager + node-exporter + kube-state-metrics.
# The release name MUST match metrics.serviceMonitorLabels.release below.
helm upgrade --install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --version 65.5.1

# Logs: Loki (single-binary) + the log-shipping agent, wired to write to Loki.
helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --version 2.10.2 \
  --set loki.singleBinary.replicas=1 \
  --set promtail.enabled=true
```

### 3. Turn on scraping in the footballhub chart

```bash
helm upgrade --install fhm deploy/helm/footballhub \
  --set image.tag=1.2.0 \
  --set metrics.enabled=true
# If you installed the stack under a different release name, also pass:
#   --set metrics.serviceMonitorLabels.release=<that-name>
```

### 4. Open Grafana

```bash
kubectl -n monitoring get secret kube-prometheus-stack-grafana \
  -o jsonpath='{.data.admin-password}' | base64 -d; echo
kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80
```

Then `http://localhost:3000` (user `admin`):
- **Metrics**: import dashboard ID `14282` (FastAPI) once; k8s/pod dashboards ship with
  the stack.
- **Logs**: Explore → Loki datasource → LogQL, e.g. `{app="fhm-footballhub"} |= "error"`.

### 5. Smoke test (optional, needs the cluster up)

Port-forward Prometheus and Loki, then run the integration smoke:

```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090:9090 &
kubectl -n monitoring port-forward svc/loki 3100:3100 &
cd backend && .venv/Scripts/python.exe -m pytest tests/integration/test_observability_smoke.py -q
```

It asserts Prometheus reports the backend target `up == 1` and that Loki has recent
backend log lines. It **skips** (not fails) when those endpoints are unreachable, so
it is safe to leave in the suite.
