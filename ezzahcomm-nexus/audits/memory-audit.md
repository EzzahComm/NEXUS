# Memory System Audit — EZZAHCOMM NEXUS
**Date:** 2026-05-14

---

## Architecture Assessment

The memory engine uses a correct design: pgvector for semantic search, OpenAI embeddings for vector generation, Supabase RPC (`match_memory`) for cosine similarity retrieval, and fallback to keyword search. The implementation is sound in structure but has several critical operational issues.

---

## Findings

### CRITICAL

**1. Wrong SDK / API key combination**

`MemoryEngine` initialises OpenAI SDK with the Anthropic key:
```typescript
this.openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
});
```

If `OPENAI_API_KEY` is absent (it is, in all current `.env` files), this falls back to the Anthropic key. OpenAI's API will reject it with `401 Unauthorized`. The `try/catch` in `store()` silently swallows this — memories are stored without embeddings. **Semantic search returns nothing.**

**Resolution:** Add `OPENAI_API_KEY` to `.env` and ensure it is set before boot.

---

### HIGH

**2. `match_memory` RPC does not exist**

The function `match_memory` is called via `supabase.rpc('match_memory', ...)` but no SQL definition exists anywhere in the codebase. Without it, all semantic queries fail silently (they fall back to `retrieveByContext`).

**Required SQL — add to migrations:**

```sql
CREATE OR REPLACE FUNCTION match_memory(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  tenant_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  key text,
  value jsonb,
  context text,
  similarity float,
  created_at timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id, key, value, context,
    1 - (embedding <=> query_embedding) AS similarity,
    created_at
  FROM nexus_memory
  WHERE
    (tenant_id_filter IS NULL OR tenant_id = tenant_id_filter)
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

**3. No index on `nexus_memory.embedding`**

Without an IVFFlat or HNSW index, pgvector performs a full table scan on every query. At 10,000+ memories this becomes unusable.

```sql
CREATE INDEX IF NOT EXISTS idx_nexus_memory_embedding
  ON nexus_memory USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**4. `retrieveByContext` has no full-text index**

`ilike('%context%')` forces a sequential scan. At any meaningful scale this query will time out.

```sql
CREATE INDEX IF NOT EXISTS idx_nexus_memory_context_fts
  ON nexus_memory USING gin(to_tsvector('english', context));
```

---

### MEDIUM

**5. No memory TTL or aging policy**

Memory grows unbounded. At 1,000 tasks/day, `nexus_memory` will have 365,000 rows in a year with no pruning. Add a `ttl_days` column and a daily purge job.

**6. No memory deduplication**

The same key can be inserted multiple times. `get()` always returns the most recent by `created_at`, silently ignoring duplicates. Add a unique constraint:

```sql
ALTER TABLE nexus_memory
  ADD CONSTRAINT uq_memory_key_tenant UNIQUE (key, tenant_id);
```

Or use upsert in `store()`:
```typescript
await this.supabase.from('nexus_memory').upsert(
  { key: entry.key, tenant_id: entry.tenant_id, ...fields },
  { onConflict: 'key,tenant_id' }
);
```

**7. Embedding truncation at 8000 chars**

`text.slice(0, 8000)` splits by character, not token. GPT tokenizers average ~4 chars/token, so 8000 chars ≈ 2000 tokens — well within the 8192-token limit for `text-embedding-3-small`. However, for longer documents, semantic quality degrades. Use chunking instead.

---

### LOW

**8. No retrieval scoring or ranking diversity**

All results are ordered by cosine similarity only. In practice, very recent memories are more relevant than high-similarity but stale ones. Consider time-decay scoring:

```sql
-- Score = similarity * recency_weight
(1 - (embedding <=> query_embedding)) * EXP(-EXTRACT(EPOCH FROM (now() - created_at)) / 86400 / 30)
```

---

## Required `nexus_memory` Table Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE nexus_memory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT NOT NULL,
  value        JSONB NOT NULL,
  context      TEXT NOT NULL,
  tenant_id    UUID REFERENCES tenants(id),
  project_id   UUID,
  embedding    vector(1536),
  ttl_days     INT DEFAULT 90,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX uq_memory_key_tenant ON nexus_memory(key, tenant_id);
CREATE INDEX idx_nexus_memory_tenant ON nexus_memory(tenant_id);
CREATE INDEX idx_nexus_memory_embedding ON nexus_memory USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_nexus_memory_context_fts ON nexus_memory USING gin(to_tsvector('english', context));

-- RLS
ALTER TABLE nexus_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON nexus_memory
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Auto-purge expired memories (run daily via pg_cron)
-- SELECT cron.schedule('purge-memory', '0 2 * * *',
--   $$DELETE FROM nexus_memory WHERE created_at < now() - (ttl_days || ' days')::interval$$);
```

---

## Memory System Readiness

| Component | Status |
|---|---|
| Vector table schema | MISSING — no migration |
| `match_memory` RPC function | MISSING — no SQL definition |
| Embedding index (HNSW) | MISSING |
| Full-text index on context | MISSING |
| OpenAI API key | MISSING from `.env` |
| Memory deduplication | MISSING |
| Memory TTL / aging | MISSING |
| Semantic retrieval (working) | BLOCKED by above |
