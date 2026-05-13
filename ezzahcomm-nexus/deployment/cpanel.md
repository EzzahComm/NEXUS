# EZZAHCOMM NEXUS — cPanel Deployment Guide

## Prerequisites
- cPanel with Node.js Selector (CloudLinux)
- Node.js 20, SSH access

---

## 1. Upload Files

```bash
ssh username@yourdomain.com
cd /home/username/
git clone https://github.com/ezzahcomm/nexus.git nexus
cd nexus && npm ci && npm run build
```

---

## 2. Setup Node.js App in cPanel

cPanel → Software → Setup Node.js App → Create Application
- Node.js version: 20
- Application mode: Production
- Application root: /home/username/nexus
- Startup file: dist/api/server.js

---

## 3. Environment Variables

Add in cPanel → Node.js App → Environment Variables:

| Key | Value |
|---|---|
| NODE_ENV | production |
| API_PORT | 3000 |
| SUPABASE_URL | https://skwgfymxyjtlxmauyidn.supabase.co |
| SUPABASE_SERVICE_ROLE_KEY | service role key |
| ANTHROPIC_API_KEY | claude api key |
| JWT_SECRET | 32+ char secret |
| REDIS_URL | managed Redis URL (Redis Cloud free tier) |
| DARAJA_CONSUMER_KEY | mpesa key |
| DARAJA_CONSUMER_SECRET | mpesa secret |
| DARAJA_SHORTCODE | shortcode |
| DARAJA_PASSKEY | passkey |
| DARAJA_CALLBACK_URL | https://yourdomain.com/api/webhooks/daraja |
| PAYSTACK_SECRET_KEY | sk_live_... |
| PAYSTACK_WEBHOOK_SECRET | webhook secret |
| TEXTSMS_API_KEY | sms api key |
| TEXTSMS_PARTNER_ID | sms partner id |

---

## 4. Run Migration

Paste supabase/migrations/nexus_runtime_schema.sql into Supabase SQL Editor.

---

## 5. Webhook URLs

- Daraja: https://yourdomain.com/api/webhooks/daraja
- Paystack: https://yourdomain.com/api/webhooks/paystack

---

## 6. Verify

```bash
curl https://yourdomain.com/health
# {"status":"healthy","checks":{"api":"ok","database":"ok"}}
```
