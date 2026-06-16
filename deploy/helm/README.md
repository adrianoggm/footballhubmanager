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
