# Deployment Audit — EZZAHCOMM NEXUS
**Date:** 2026-05-14

---

## CI/CD Pipeline (GitHub Actions)

### `deploy.yml` — VPS Deploy
| Step | Status | Notes |
|---|---|---|
| Build & type-check | PASS | `tsc --noEmit` + `npm run build` |
| Security scan (TruffleHog) | PASS | Secret scanning on every push |
| npm audit | PASS | `continue-on-error: true` — consider making blocking |
| SSH deploy via `appleboy/ssh-action` | PASS | Standard pattern |
| `git reset --hard origin/main` | PASS | Clean deploy |
| `npm ci --omit=dev` | PASS | Production-only deps |
| PM2 reload | PASS | `pm2 reload ecosystem.config.js --env production --update-env` |
| Health check gate | PASS | Checks `{"status":"healthy"}` before marking success |
| Failure notification | PASS | Logs commit SHA and run URL |

**Issue:** Health check uses `grep -q '"status":"healthy"'` — Node.js `JSON.stringify` adds no spaces so this is fine, but fragile. Consider `jq -e '.status == "healthy"'` instead.

### `vercel.yml` — Frontend Deploy
| Step | Status | Notes |
|---|---|---|
| PR preview deployments | PASS | Comment with preview URL |
| Production deploy on main | PASS | `--prod` flag |
| Path filtering (only `frontend/**`) | PASS | Avoids unnecessary redeploys |

### `pr-checks.yml` — PR Gates
| Step | Status | Notes |
|---|---|---|
| Type-check | PASS | |
| TODO/FIXME scan | PASS | `continue-on-error: true` |
| `.env.example` key validation | FIXED | Was checking `DARAJA_CONSUMER_KEY`; now `MPESA_CONSUMER_KEY` |

---

## Docker Compose

### Services Status
| Service | Implemented | Notes |
|---|---|---|
| `nexus-core` | YES | Orchestrator entrypoint |
| `nexus-orchestrator` | YES | Duplicate of core — review if both needed |
| `nexus-api` | YES | Port 4000 |
| `nexus-worker` | YES | BullMQ worker |
| `nexus-memory` | PARTIAL | Memory engine exists |
| `nexus-dashboard` | BLOCKED | Dockerfile now exists; needs `npm install` in frontend |
| `nexus-redis` | YES | Redis 7 Alpine |
| `nexus-nginx` | YES | Proxy |
| `nexus-marketplace` | STUB | Falls through to orchestrator |
| `nexus-billing` | STUB | Falls through to orchestrator |
| `nexus-marketing` | STUB | Falls through to orchestrator |
| `nexus-sms` | STUB | Falls through to orchestrator |
| `nexus-analytics` | STUB | Falls through to orchestrator |
| `nexus-deployment` | STUB | Falls through to orchestrator |

**Recommendation:** Remove stub services from `docker-compose.yml` or add proper `SERVICE` env → entrypoint mappings in `Dockerfile.core` CMD.

### Missing in Docker Compose
```yaml
# Add to every service:
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s

# Add resource limits:
deploy:
  resources:
    limits:
      memory: 512M
```

---

## PM2 Ecosystem

| Process | Mode | Instances | Memory Limit | Status |
|---|---|---|---|---|
| `nexus-api` | cluster | max | 256M | GOOD |
| `nexus-orchestrator` | fork | 1 | 512M | GOOD |
| `nexus-worker` | fork | 2 | 384M | GOOD |

**Issue:** `ecosystem.config.js` uses `env_production` key but PM2 reads it via `--env production`. Verify this is passed in the deploy script (`pm2 reload ... --env production` — confirmed).

---

## NGINX

| Check | Status | Notes |
|---|---|---|
| HTTP → HTTPS redirect | PASS | `return 301 https://$host$request_uri` |
| TLS 1.2/1.3 only | PASS | `ssl_protocols TLSv1.2 TLSv1.3` |
| HSTS header | FIXED | Added `max-age=31536000; includeSubDomains` |
| Gzip compression | PASS | JSON, JS, CSS compressed |
| Rate limiting zones | PASS | 60r/m API, 120r/m webhooks |
| `server_tokens off` | PASS | Hides nginx version |
| Domain name | FIXED | Was `yourdomain.com`; now `kitabuyetu.ezzahcomm.co.ke` |
| SSL cert path | MANUAL | `/etc/nginx/ssl/fullchain.pem` — provision via Let's Encrypt |

### Let's Encrypt Setup (run on VPS)
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d kitabuyetu.ezzahcomm.co.ke -d www.kitabuyetu.ezzahcomm.co.ke
```

---

## VPS Checklist

Before first deploy, on the VPS:

```bash
# 1. Create app directory
mkdir -p /var/www/nexus && cd /var/www/nexus

# 2. Clone repo
git clone git@github.com:EzzahComm/nexus.git .

# 3. Copy .env
cp /opt/nexus/.env .env

# 4. Install deps and build
npm ci && npm run build

# 5. Start PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 6. Provision SSL
certbot --nginx -d kitabuyetu.ezzahcomm.co.ke

# 7. Reload NGINX
nginx -t && systemctl reload nginx
```

---

## Missing: `vercel.json`

The Vercel deployment needs a rewrite rule to proxy `/api/*` to the VPS. Create at repo root:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.ezzahcomm.co.ke/api/:path*"
    }
  ]
}
```
