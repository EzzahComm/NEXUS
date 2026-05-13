# GitHub Actions — Required Secrets

Configure these in: **GitHub → Settings → Secrets and variables → Actions**

---

## Architecture

```text
Browser
  └─► Vercel (Next.js frontend)
          │  /api/* rewrite
          ▼
      VPS — NGINX
               ├─► Express API      :4000
               ├─► Orchestrator     :3000
               └─► Workers
      Supabase  ◄── shared by Vercel + VPS
```

- **Vercel** serves the Next.js dashboard and proxies `/api/*` to the VPS.
- **NGINX** on the VPS terminates SSL and routes to the API, Orchestrator, and Workers.
- **Supabase** is the shared database/auth layer for both tiers.

---

## 1 — Deployment Secrets (GitHub Actions)

| Secret | Description |
|---|---|
| `VPS_HOST` | VPS IP address or hostname |
| `VPS_USER` | SSH username (e.g. `ubuntu`) |
| `VPS_SSH_KEY` | Private SSH key (full contents of `~/.ssh/nexus_deploy`) |
| `VPS_PORT` | SSH port — defaults to `22` if not set |
| `APP_URL` | Production URL e.g. `https://kitabuyetu.ezzahcomm.co.ke` |

---

## 2 — Vercel Secrets (frontend CI)

| Secret | Description | Where to find |
|---|---|---|
| `VERCEL_TOKEN` | Vercel personal access token | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | Your Vercel team/org ID | vercel.com → Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Nexus project ID | vercel.com → Project → Settings → General |

### Vercel Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables**:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://skwgfymxyjtlxmauyidn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `NEXT_PUBLIC_API_URL` | `https://api.ezzahcomm.co.ke` |
| `DATABASE_URL` | Transaction pooler URL (port 6543) |
| `DIRECT_URL` | Direct DB URL (port 5432) |

---

## 3 — VPS Environment Variables

Write these to `/opt/nexus/.env` on the VPS (sourced by systemd units and Docker Compose).

### Runtime

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` (Orchestrator) |
| `API_PORT` | `4000` (Express API) |
| `LOG_LEVEL` | `info` |

### Supabase

| Key | Notes |
|---|---|
| `SUPABASE_URL` | `https://skwgfymxyjtlxmauyidn.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase → Project → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project → API (keep secret) |
| `DATABASE_URL` | Transaction pooler — port 6543 |
| `DATABASE_DIRECT_URL` | Direct connection — port 5432 |

### Redis (Upstash)

| Key | Notes |
|---|---|
| `REDIS_URL` | `rediss://...@alive-jawfish-116857.upstash.io:6379` |
| `UPSTASH_REDIS_REST_URL` | `https://alive-jawfish-116857.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console → DB → REST API |

### Claude AI

| Key | Notes |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `CLAUDE_MODEL` | `claude-opus-4-6` |

### M-Pesa (MPESA)

| Key | Notes |
|---|---|
| `MPESA_ENV` | `production` |
| `MPESA_CONSUMER_KEY` | Safaricom Developer Portal |
| `MPESA_CONSUMER_SECRET` | Safaricom Developer Portal |
| `MPESA_SHORTCODE` | `4044141` |
| `MPESA_PASSKEY` | Safaricom Developer Portal |
| `MPESA_CALLBACK_URL` | `https://kitabuyetu.ezzahcomm.co.ke/api/v1/mpesa/callback` |
| `MPESA_CALLBACK_BASE_URL` | `https://kitabuyetu.ezzahcomm.co.ke` |
| `MPESA_B2C_SHORTCODE` | `4044141` |
| `MPESA_B2C_SECURITY_CREDENTIAL` | Encrypted via Safaricom cert |
| `MPESA_ALLOWED_IPS` | Safaricom IP whitelist (optional) |

### Paystack

| Key | Notes |
|---|---|
| `PAYSTACK_SECRET_KEY` | dashboard.paystack.com → Settings → API |
| `PAYSTACK_PUBLIC_KEY` | dashboard.paystack.com → Settings → API |
| `PAYSTACK_WEBHOOK_SECRET` | Set when registering webhook URL |

### SMS (textsms.co.ke)

| Key | Value |
|---|---|
| `TEXTSMS_API_KEY` | textsms.co.ke dashboard |
| `TEXTSMS_PARTNER_ID` | `14643` |
| `TEXTSMS_SENDER_ID` | `EZZAH COMM` |
| `TEXTSMS_BASE_URL` | `https://sms.textsms.co.ke` |

### Email

| Key | Value |
|---|---|
| `EMAIL_PROVIDER` | `resend` |
| `EMAIL_FROM` | `noreply@ezzahcomm.co.ke` |
| `EMAIL_ADMIN` | `admin@ezzahcomm.co.ke` |
| `RESEND_API_KEY` | resend.com → API Keys |
| `SMTP_HOST` | Fallback SMTP host |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Fallback SMTP user |
| `SMTP_PASS` | Fallback SMTP password |

### JWT / Auth

| Key | Notes |
|---|---|
| `JWT_SECRET` | 64-byte hex — generate with `openssl rand -hex 64` |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |

### Encryption & Workers

| Key | Notes |
|---|---|
| `ENCRYPTION_KEY` | 32-byte hex — generate with `openssl rand -hex 32` |
| `WORKER_SECRET` | Shared secret between API and workers |
| `CRON_SECRET` | Auth token for cron endpoints |

### Social Media APIs

| Key | Where |
|---|---|
| `META_APP_ID` / `META_APP_SECRET` / `META_ACCESS_TOKEN` | developers.facebook.com |
| `TWITTER_API_KEY` / `TWITTER_API_SECRET` | developer.twitter.com |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | linkedin.com/developers |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | developers.tiktok.com |

### WhatsApp Business

| Key | Where |
|---|---|
| `WHATSAPP_API_URL` | Meta Business → WhatsApp |
| `WHATSAPP_ACCESS_TOKEN` | Meta Business → WhatsApp |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Business → WhatsApp |

### Monitoring & AI

| Key | Value |
|---|---|
| `SENTRY_DSN` | sentry.io → Project → Settings → Client Keys |
| `UPTIME_CHECK_INTERVAL` | `60000` |
| `EMBEDDING_MODEL` | `text-embedding-3-small` |
| `VECTOR_DIMENSION` | `1536` |

---

## Generating an SSH Deploy Key

```bash
# On your local machine
ssh-keygen -t ed25519 -C "nexus-deploy" -f ~/.ssh/nexus_deploy

# Add public key to VPS
ssh-copy-id -i ~/.ssh/nexus_deploy.pub ubuntu@your-vps-ip

# Paste the PRIVATE key contents into VPS_SSH_KEY secret
cat ~/.ssh/nexus_deploy
```
