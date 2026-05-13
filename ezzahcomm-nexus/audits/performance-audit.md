# Performance Audit — EZZAHCOMM NEXUS
**Date:** 2026-05-14

---

## API Performance

| Endpoint | Concern | Fix |
|---|---|---|
| `GET /api/tasks` | No DB index on `tenant_id + status + created_at` | Composite index |
| `GET /api/sms/logs` | No index on `tenant_id + campaign_id` | Composite index |
| `GET /api/tenants/me/stats` | 4 parallel count queries — expensive | Materialised view or cache |
| `POST /api/agents/dispatch` | Creates Orchestrator instance (see runtime audit) | Singleton |
| All routes | No response time logging | Add `pino-http` timer |

---

## Database Query Performance

### Missing Indexes

```sql
-- Tasks: primary query pattern
CREATE INDEX idx_tasks_tenant_status
  ON tasks(tenant_id, status, created_at DESC);

-- Tasks: priority queue scan
CREATE INDEX idx_tasks_pending_priority
  ON tasks(priority, created_at)
  WHERE status = 'pending';

-- Mobile money: pending payment polling
CREATE INDEX idx_mpesa_pending
  ON mobile_money_transactions(checkout_request_id)
  WHERE status = 'pending';

-- SMS logs: campaign delivery lookup
CREATE INDEX idx_sms_logs_campaign
  ON sms_logs(tenant_id, campaign_id, status);

-- Agents: tenant listing
CREATE INDEX idx_agents_tenant
  ON agents(tenant_id, status);
```

### Expensive Operations

1. **`tenant/me/stats`** runs 4 count queries serially in the route (it uses `Promise.all` — actually parallel, but 4 RTTs to Supabase per request). Cache in Redis for 5 minutes:

```typescript
const cacheKey = `stats:${tenantId}`;
const cached = await redis.get(cacheKey);
if (cached) return res.json(JSON.parse(cached));
// ... compute
await redis.setex(cacheKey, 300, JSON.stringify(stats));
```

2. **Memory semantic search** — no HNSW index means O(n) scan. Blocks until fixed.

---

## BullMQ / Worker Performance

| Metric | Current | Target |
|---|---|---|
| Worker concurrency | 5 (orchestrator) | 5–10 based on VPS RAM |
| PM2 worker instances | 2 | Scale with CPU count |
| Retry backoff | None | Exponential (5s, 10s, 20s...) |
| Job TTL | None | 7 days for completed |
| Queue monitoring | None | Bull Board or Taskforce.sh |

### Add completed job TTL

```typescript
await this.taskQueue.add(task.type, data, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: 7 * 24 * 3600 },  // keep 7 days
  removeOnFail: { age: 30 * 24 * 3600 },     // keep 30 days
});
```

---

## Frontend Performance

| Check | Status |
|---|---|
| Next.js `output: 'standalone'` | PASS — set in next.config.js |
| Image optimization | PASS — next/image configured |
| Tailwind CSS purging | PASS — content paths set |
| Font loading (`next/font`) | PASS — Inter font in layout.tsx |
| Bundle analysis | NOT DONE — run `ANALYZE=true next build` |
| Lazy-loaded sections | MISSING — all landing sections load eagerly |
| Error boundaries | MISSING |

### Add lazy loading for below-fold sections

```typescript
// app/page.tsx
import dynamic from 'next/dynamic';

const Testimonials = dynamic(() => import('@/components/landing/Testimonials'));
const FAQ = dynamic(() => import('@/components/landing/FAQ'));
```

---

## SMS Throughput

TextSMS batches of 100 with 500ms sleep between batches. For 5,000 recipients:
- 50 batches × 500ms = 25 seconds minimum
- Concurrent within each batch (100 parallel requests)
- API rate limit: verify with textsms.co.ke (unknown, assumed ~100/s)

**Recommendation:** Move bulk campaigns to a dedicated BullMQ queue with controlled concurrency:

```typescript
const campaignQueue = new Queue('sms-campaigns', { connection: { url: REDIS_URL } });
const campaignWorker = new Worker('sms-campaigns', async (job) => {
  await sms.sendBulk(job.data);
}, { connection: { url: REDIS_URL }, concurrency: 1 }); // one campaign at a time
```

---

## Memory / CPU Targets (VPS)

| Process | RAM Limit | Recommended VPS |
|---|---|---|
| `nexus-api` (cluster × max) | 256M × cores | 2GB+ RAM |
| `nexus-orchestrator` | 512M | |
| `nexus-worker` (× 2) | 384M × 2 | |
| Redis | ~100M | |
| NGINX | ~50M | |
| **Total** | ~1.7GB baseline | **4GB VPS minimum** |
