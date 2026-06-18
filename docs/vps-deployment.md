# Deploying on a VPS (k3s + HTTPS)

A complete, copy-paste runbook to deploy footballhubmanager on a single cheap VPS
using **k3s** (lightweight Kubernetes), **ingress-nginx**, **cert-manager**, and the
Helm chart in `deploy/helm/footballhub`. Result: the app served at
`https://app.example.com` with an auto-renewing Let's Encrypt certificate.

This is the operator counterpart to the TLS model documented in
[deployment.md](deployment.md#https--tls). Example files referenced here live in
[`deploy/helm/footballhub/examples/`](../deploy/helm/footballhub/examples/).

## 0. What you need first

- A **VPS** with a **dedicated public IPv4** and Ubuntu 22.04/24.04
  (e.g. Hetzner CX22, ~5 €/mo — 2 vCPU / 4 GB is comfortable for backend + MySQL +
  frontend on one node).
- A **domain** (e.g. Cloudflare Registrar / Namecheap / Porkbun).
- SSH access to the VPS as root (or a sudo user).

> Sizing: with in-cluster MySQL, give the node at least 4 GB RAM. 2 GB works but is
> tight once MySQL warms up.

## 1. Point DNS at the VPS

Create a DNS **A record** for your host pointing at the VPS public IP:

```
app.example.com.   A   <VPS_PUBLIC_IP>
```

Verify it has propagated before requesting a certificate (Let's Encrypt validates
over HTTP, so the name must already resolve to this box):

```bash
dig +short app.example.com   # must print <VPS_PUBLIC_IP>
```

## 2. Harden the VPS (quick pass)

```bash
# as root on the VPS
apt update && apt upgrade -y
# Allow SSH + HTTP + HTTPS only
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 6443/tcp   # k3s API (restrict to your IP if possible)
ufw --force enable
```

## 3. Install k3s

k3s ships with Traefik by default; we disable it because the chart's annotations
target **ingress-nginx**.

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik" sh -

# kubectl is installed as part of k3s; its kubeconfig is here:
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes        # node should be Ready
```

To run `kubectl`/`helm` from your laptop instead, copy `/etc/rancher/k3s/k3s.yaml`,
replace `127.0.0.1` with the VPS public IP, and point `KUBECONFIG` at it.

Install Helm (on whichever machine runs the deploy):

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## 4. Install ingress-nginx + cert-manager

```bash
# ingress-nginx
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace

# cert-manager
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  -n cert-manager --create-namespace --set crds.enabled=true

kubectl get pods -n ingress-nginx
kubectl get pods -n cert-manager   # all Running before continuing
```

On a single-node k3s the ingress-nginx Service is usually exposed via the node's
ports 80/443 directly. Confirm traffic reaches it:

```bash
curl -I http://app.example.com/   # 404 from nginx is fine — it means it's reachable
```

## 5. Create the Let's Encrypt ClusterIssuer (once)

Edit the email, then apply:

```bash
# edit deploy/helm/footballhub/examples/clusterissuer-letsencrypt-prod.yaml (email)
kubectl apply -f deploy/helm/footballhub/examples/clusterissuer-letsencrypt-prod.yaml
kubectl get clusterissuer letsencrypt-prod   # READY=True
```

> First time? Point `spec.acme.server` at the **staging** endpoint to avoid burning
> Let's Encrypt rate limits while you debug. Switch to prod once the flow works.

## 6. Deploy the app (HTTPS, step 1 of 2)

Copy and edit the example values (domain + DB passwords):

```bash
cp deploy/helm/footballhub/examples/values-prod.yaml /tmp/values-prod.yaml
# edit: ingress.host, app.allowedHosts, app.corsAllowedOrigins, mysql passwords
```

### In-cluster MySQL first-install caveat

The migration Job runs as a Helm **pre-install hook**, but on a *fresh* install the
in-cluster MySQL StatefulSet isn't up yet, so the hook would time out. So the very
first install disables migrations, then a follow-up upgrade runs them (see
[NOTES.txt](../deploy/helm/footballhub/templates/NOTES.txt)). With an **external DB**
this caveat does not apply — skip straight to the normal install.

```bash
# First install (in-cluster MySQL): migrations off, redirect off
helm install footballhub ./deploy/helm/footballhub -f /tmp/values-prod.yaml \
  --set migrations.enabled=false --set app.strictMigrationCheck=false

# Now MySQL is up — upgrade to run migrations
helm upgrade footballhub ./deploy/helm/footballhub -f /tmp/values-prod.yaml
```

(For an external/managed DB: just `helm install footballhub ./deploy/helm/footballhub -f /tmp/values-prod.yaml`.)

## 7. Wait for the certificate

```bash
kubectl get certificate            # wait for footballhub-tls -> READY=True
kubectl describe certificate footballhub-tls   # if it stalls, read the events
kubectl get challenges             # HTTP-01 challenges should resolve & disappear
```

Common stalls: DNS not resolving to the VPS yet, port 80 blocked (cert-manager's
HTTP-01 needs inbound :80), or the wrong `ingress.className`.

## 8. Turn on HTTPS redirect + HSTS (step 2 of 2)

Once the cert is `Ready`:

```bash
helm upgrade footballhub ./deploy/helm/footballhub -f /tmp/values-prod.yaml \
  --set ingress.forceHttpsRedirect=true \
  --set ingress.hsts.enabled=true
```

(Or set those two to `true` in your values file and `helm upgrade`.)

## 9. Verify

```bash
curl -I http://app.example.com/     # 301/308 -> https
curl -I https://app.example.com/    # 200 + Strict-Transport-Security header
curl https://app.example.com/api/   # {"status":"ok","service":"FootballHubManager API"}
```

In a browser: valid padlock, app loads, and the PWA can install (the service worker
requires HTTPS in production).

## 10. Day-2 operations

- **New release:** push a `vX.Y.Z` tag (CI builds images), then
  `helm upgrade footballhub ./deploy/helm/footballhub -f /tmp/values-prod.yaml --set image.tag=X.Y.Z`.
  The pre-upgrade migration Job applies pending `vN.sql` before the API rolls out.
- **Cert renewal:** automatic via cert-manager (~30 days before expiry). Nothing to do.
- **MySQL backups (you own these on a single VPS):** schedule a `mysqldump` to an
  off-box bucket (Cloudflare R2 / Backblaze B2), e.g. a CronJob or host cron. A
  single-node VPS has no HA — back up regularly.
- **Logs:** `kubectl logs deploy/footballhub-backend`,
  `kubectl logs job/<migrate-job>`.

## Notes / limitations

- **Single node = no high availability.** A reboot or disk failure takes the app
  down. For real production move to a managed DB and/or multiple nodes, or a managed
  Kubernetes (Hetzner, DigitalOcean ~12 $/mo per node).
- The redirect/HSTS annotations are `nginx.ingress.kubernetes.io/*`. On a different
  ingress controller, set equivalents via `ingress.annotations` and leave
  `forceHttpsRedirect`/`hsts` off.
- EU data residency (GDPR): pick an EU region for the VPS if you store personal data.
