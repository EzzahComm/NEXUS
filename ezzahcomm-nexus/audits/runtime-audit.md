# Runtime Audit — EZZAHCOMM NEXUS
**Date:** 2026-05-14

---

## Orchestrator

### Findings

| # | Severity | Issue |
|---|---|---|
| 1 | CRITICAL | `new NexusOrchestrator()` in `agents.ts` module scope — creates a BullMQ worker + cron jobs on every API import |
| 2 | HIGH | No `max_tokens` cap or timeout on `claude.messages.create()` in `TaskEngine.delegateToAgent()` — hung call blocks the worker indefinitely |
| 3 | HIGH | `tasksRouter.patch()` uses `.parse()` (throws) instead of `.safeParse()` — unhandled 500 on bad input |
| 4 | MEDIUM | `scanPendingTasks()` queues all tasks with same priority — BullMQ priority ordering is per job; passing the same value loses ordering |
| 5 | MEDIUM | No execution lock — if two orchestrator instances run simultaneously (e.g. PM2 cluster restart overlap), the same task could be dispatched twice |
| 6 | LOW | `orchestrator.shutdown()` in `agents.ts` is never called — worker connection leaks on process exit |

### Fix 1 — Orchestrator singleton (agents.ts)

`agents.ts` instantiates a full `NexusOrchestrator` at module scope. The orchestrator starts a BullMQ worker and registers cron jobs on construction. Every API server worker process (PM2 cluster) creates redundant workers.

**Fix:** Export a singleton and import it, or pass the orchestrator from `server.ts`:

```typescript
// src/runtime/orchestrator.ts — add at bottom
let _instance: NexusOrchestrator | null = null;
export function getOrchestrator(): NexusOrchestrator {
  if (!_instance) _instance = new NexusOrchestrator();
  return _instance;
}
```

Then in `agents.ts`:
```typescript
import { getOrchestrator } from '../../runtime/orchestrator';
const orchestrator = getOrchestrator();
```

### Fix 2 — Claude API timeout

```typescript
// In TaskEngine.delegateToAgent()
const response = await Promise.race([
  this.claude.messages.create({ ... }),
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Claude API timeout after 60s')), 60_000)
  ),
]);
```

### Fix 3 — tasksRouter.patch safeParse

```typescript
// Before:
const { status } = z.object({ status: z.enum(['cancelled']) }).parse(req.body);

// After:
const parsed = z.object({ status: z.enum(['cancelled']) }).safeParse(req.body);
if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
const { status } = parsed.data;
```

### Fix 4 — BullMQ priority mapping

```typescript
// In orchestrator.dispatch():
const PRIORITY_MAP = { critical: 1, high: 2, medium: 3, low: 4 };
await this.taskQueue.add(task.type, { ...task, id: taskId }, {
  priority: PRIORITY_MAP[task.priority],
  attempts: 5,
  backoff: { type: 'exponential', delay: 5000 },
});
```

---

## Task Engine

### Missing: Retry Configuration

BullMQ jobs are added with no `attempts` or `backoff`. If Claude API fails transiently, the task is immediately marked failed with no retry.

**Fix:** Add retry config to all `queue.add()` calls:
```typescript
{ attempts: 5, backoff: { type: 'exponential', delay: 5000 } }
```

### Missing: Heartbeat / Stale Task Recovery

Tasks stuck `in_progress` for > 10 minutes need to be reset. Add a cron to `orchestrator.ts`:

```typescript
// Every 10 minutes: reset stale in-progress tasks
cron.schedule('*/10 * * * *', async () => {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await this.supabase
    .from('tasks')
    .update({ status: 'pending' })
    .eq('status', 'in_progress')
    .lt('updated_at', cutoff);
});
```

---

## Memory Engine

### Findings

| # | Severity | Issue |
|---|---|---|
| 1 | CRITICAL | `new OpenAI({ apiKey: process.env.ANTHROPIC_API_KEY })` — Anthropic key used with OpenAI SDK will fail silently with 401 |
| 2 | HIGH | `retrieveByContext` uses `ilike('%context%')` — no GIN/TRGM index on `context` column, full table scan at scale |
| 3 | MEDIUM | No memory TTL / aging — memory table will grow unbounded |
| 4 | MEDIUM | `match_memory` Supabase RPC is called but the function definition doesn't exist in any migration file |
| 5 | LOW | `embed()` slices input to 8000 chars — no tokenization awareness, may cut mid-word |

### Fix 1 — OpenAI API key

Either add `OPENAI_API_KEY` to `.env`, or switch to a supported embedding provider. Best option for this stack is to use OpenAI API key separately. Add to `.env`:

```env
OPENAI_API_KEY=sk-...
```

Or use Voyager/Cohere as alternative if avoiding OpenAI dependency.

### Fix 2 — Add context index (SQL)

```sql
CREATE INDEX IF NOT EXISTS idx_nexus_memory_context
  ON nexus_memory USING gin(to_tsvector('english', context));
```

---

## AI Agent Orchestration

### Missing Systems

| System | Status | Risk |
|---|---|---|
| Task execution locks (prevent duplicate execution) | MISSING | HIGH |
| Heartbeat / dead agent detection | MISSING | HIGH |
| Agent health table | MISSING | MEDIUM |
| Workflow execution audit trail | MISSING | MEDIUM |
| Autonomous improvement loop validation | PARTIAL | MEDIUM |
| Agent timeout per-type | MISSING | MEDIUM |

### Recommended: Execution Lock via Redis

```typescript
// In TaskEngine.delegateToAgent():
const lockKey = `task:lock:${task.id}`;
const locked = await redis.set(lockKey, '1', 'EX', 300, 'NX');
if (!locked) throw new Error('Task already executing — skipping duplicate');
try {
  // ... execute
} finally {
  await redis.del(lockKey);
}
```
