# EZZAHCOMM NEXUS — VPS Deployment Guide

## Target Stack
Ubuntu 22.04 LTS · Node.js 20 · PM2 · NGINX · Redis · Certbot SSL

---

## 1. Server Preparation

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pm2
sudo apt install -y nginx redis-server certbot python3-certbot-nginx
sudo systemctl enable redis-server && sudo systemctl start redis-server
```

---

## 2. Clone and Configure

```bash
sudo mkdir -p /var/www/nexus && sudo chown ubuntu:ubuntu /var/www/nexus
cd /var/www/nexus
git clone https://github.com/ezzahcomm/nexus.git .
npm ci && npm run build
cp .env.example .env && nano .env
```

---

## 3. Supabase Migration

Paste `supabase/migrations/nexus_runtime_schema.sql` into Supabase SQL Editor,
or run: `supabase db push --db-url "$DATABASE_DIRECT_URL"`

---

## 4. Start with PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup systemd
pm2 status
```

---

## 5. NGINX

```bash
sudo cp docker/nginx.conf /etc/nginx/nginx.conf
# Replace yourdomain.com with your actual domain
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. SSL

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot renew --dry-run
```

---

## 7. Firewall

```bash
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

---

## 8. Verify

```bash
curl https://yourdomain.com/health
pm2 monit
pm2 logs nexus-api --lines 50
```

---

## Rollback

```bash
git log --oneline -10
git checkout <commit-hash>
npm ci && npm run build
pm2 reload ecosystem.config.js --env production
```

---

## Required Environment Variables

| Variable | Value |
|---|---|
| SUPABASE_URL | https://skwgfymxyjtlxmauyidn.supabase.co |
| SUPABASE_SERVICE_ROLE_KEY | service role key |
| DATABASE_DIRECT_URL | postgresql://postgres:[PW]@db.skwgfymxyjtlxmauyidn.supabase.co:5432/postgres |
| ANTHROPIC_API_KEY | claude api key |
| REDIS_URL | redis://localhost:6379 |
| JWT_SECRET | 32+ char random string |
| DARAJA_CONSUMER_KEY | mpesa key |
| DARAJA_CONSUMER_SECRET | mpesa secret |
| DARAJA_SHORTCODE | shortcode |
| DARAJA_PASSKEY | passkey |
| DARAJA_CALLBACK_URL | https://yourdomain.com/api/webhooks/daraja |
| PAYSTACK_SECRET_KEY | sk_live_... |
| PAYSTACK_WEBHOOK_SECRET | webhook secret |
| TEXTSMS_API_KEY | sms key |
| TEXTSMS_PARTNER_ID | sms partner id |
