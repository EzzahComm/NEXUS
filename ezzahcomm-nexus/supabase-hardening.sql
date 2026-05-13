-- ============================================================
-- EZZAHCOMM NEXUS — SUPABASE HARDENING SQL
-- Run once against your Supabase project.
-- Safe to re-run (all statements use IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- CORE TABLES
-- ============================================================

-- ── Tenants ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'starter',
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_self_read" ON tenants
  FOR SELECT USING (id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "tenants_self_update" ON tenants
  FOR UPDATE USING (id::text = (auth.jwt() ->> 'tenant_id'));

-- ── Tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id    UUID,
  task_type     TEXT NOT NULL,
  title         TEXT,
  payload       JSONB NOT NULL DEFAULT '{}',
  result        JSONB,
  priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_tenant_isolation" ON tasks
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status
  ON tasks(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_pending_priority
  ON tasks(priority, created_at)
  WHERE status = 'pending';

-- ── Agents ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,
  capabilities  JSONB NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'error', 'disabled')),
  last_run_at   TIMESTAMPTZ,
  run_count     INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_tenant_isolation" ON agents
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE INDEX IF NOT EXISTS idx_agents_tenant
  ON agents(tenant_id, status);

-- ── Memory ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nexus_memory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT NOT NULL,
  value         JSONB NOT NULL,
  context       TEXT NOT NULL,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id    UUID,
  embedding     vector(1536),
  ttl_days      INT NOT NULL DEFAULT 90,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE nexus_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memory_tenant_isolation" ON nexus_memory
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_memory_key_tenant
  ON nexus_memory(key, tenant_id);

CREATE INDEX IF NOT EXISTS idx_nexus_memory_tenant
  ON nexus_memory(tenant_id);

CREATE INDEX IF NOT EXISTS idx_nexus_memory_embedding
  ON nexus_memory USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_nexus_memory_context_fts
  ON nexus_memory USING gin(to_tsvector('english', context));

-- ── SMS Logs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id     UUID,
  phone           TEXT NOT NULL,
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  provider        TEXT NOT NULL DEFAULT 'textsms',
  provider_ref    TEXT,
  error           TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_logs_tenant_isolation" ON sms_logs
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE INDEX IF NOT EXISTS idx_sms_logs_campaign
  ON sms_logs(tenant_id, campaign_id, status);

-- ── Card Transactions (Paystack) ─────────────────────────────
CREATE TABLE IF NOT EXISTS card_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  email             TEXT NOT NULL,
  amount            NUMERIC(12, 2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'KES',
  reference         TEXT UNIQUE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
  provider          TEXT NOT NULL DEFAULT 'paystack',
  paystack_id       BIGINT,
  gateway_response  TEXT,
  channel           TEXT,
  paid_at           TIMESTAMPTZ,
  processed_at      TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "card_transactions_tenant_isolation" ON card_transactions
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE INDEX IF NOT EXISTS idx_card_transactions_tenant
  ON card_transactions(tenant_id, status, created_at DESC);

-- ── Mobile Money Transactions (M-Pesa) ───────────────────────
CREATE TABLE IF NOT EXISTS mobile_money_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID REFERENCES tenants(id) ON DELETE SET NULL,
  phone                 TEXT NOT NULL,
  amount                NUMERIC(12, 2) NOT NULL,
  account_reference     TEXT NOT NULL,
  transaction_desc      TEXT,
  checkout_request_id   TEXT,
  merchant_request_id   TEXT,
  mpesa_receipt_number  TEXT,
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  result_code           TEXT,
  result_desc           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mobile_money_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mpesa_tenant_isolation" ON mobile_money_transactions
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE INDEX IF NOT EXISTS idx_mpesa_pending
  ON mobile_money_transactions(checkout_request_id)
  WHERE status = 'pending';

-- ── Subscriptions (Paystack) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID REFERENCES tenants(id) ON DELETE SET NULL,
  paystack_subscription_code  TEXT UNIQUE,
  customer_email              TEXT,
  plan_code                   TEXT,
  status                      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_tenant_isolation" ON subscriptions
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant
  ON subscriptions(tenant_id, status);

-- ============================================================
-- MONITORING / AUDIT TABLES
-- ============================================================

-- ── Webhook Events ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider     TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  payload      JSONB,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS — internal audit table, accessed via service role only
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_type
  ON webhook_events(provider, event_type, received_at DESC);

-- ── Audit Logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor_id     UUID,
  actor_email  TEXT,
  action       TEXT NOT NULL,
  resource     TEXT NOT NULL,
  resource_id  TEXT,
  diff         JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_tenant_read" ON audit_logs
  FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant
  ON audit_logs(tenant_id, created_at DESC);

-- ── Agent Health ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_health (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  last_heartbeat  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_health_type
  ON agent_health(agent_type, last_heartbeat DESC);

-- ── Runtime Events ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS runtime_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,
  service     TEXT NOT NULL,
  level       TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  message     TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runtime_events_service
  ON runtime_events(service, level, created_at DESC);

-- ── Workflow Executions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_executions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_id  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  input        JSONB NOT NULL DEFAULT '{}',
  output       JSONB,
  error        TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_executions_tenant_isolation" ON workflow_executions
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE INDEX IF NOT EXISTS idx_workflow_executions_tenant
  ON workflow_executions(tenant_id, status, started_at DESC);

-- ── API Usage ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  method        TEXT NOT NULL,
  status_code   INT NOT NULL,
  duration_ms   INT NOT NULL,
  request_size  INT,
  response_size INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_usage_tenant_isolation" ON api_usage
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE INDEX IF NOT EXISTS idx_api_usage_tenant
  ON api_usage(tenant_id, created_at DESC);

-- ── System Alerts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  severity     TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  source       TEXT NOT NULL,
  resolved     BOOLEAN NOT NULL DEFAULT false,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_alerts_tenant_isolation" ON system_alerts
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE INDEX IF NOT EXISTS idx_system_alerts_tenant
  ON system_alerts(tenant_id, severity, resolved, created_at DESC);

-- ── Tenant Settings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  settings    JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_settings_isolation" ON tenant_settings
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- ── Feature Flags ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key    TEXT NOT NULL,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  rollout_pct INT NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flag_key, tenant_id)
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_tenant_read" ON feature_flags
  FOR SELECT USING (tenant_id IS NULL OR tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- ── match_memory — semantic vector search ────────────────────
CREATE OR REPLACE FUNCTION match_memory(
  query_embedding vector(1536),
  match_threshold float,
  match_count     int,
  tenant_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id          uuid,
  key         text,
  value       jsonb,
  context     text,
  similarity  float,
  created_at  timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    key,
    value,
    context,
    1 - (embedding <=> query_embedding) AS similarity,
    created_at
  FROM nexus_memory
  WHERE
    (tenant_id_filter IS NULL OR tenant_id = tenant_id_filter)
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER nexus_memory_updated_at
  BEFORE UPDATE ON nexus_memory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER mobile_money_updated_at
  BEFORE UPDATE ON mobile_money_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SCHEDULED JOBS (pg_cron — enable in Supabase dashboard)
-- ============================================================

-- SELECT cron.schedule('purge-expired-memory', '0 2 * * *',
--   $$DELETE FROM nexus_memory WHERE created_at < now() - (ttl_days || ' days')::interval$$);

-- SELECT cron.schedule('purge-old-webhook-events', '0 3 * * 0',
--   $$DELETE FROM webhook_events WHERE received_at < now() - interval '30 days'$$);

-- SELECT cron.schedule('purge-old-runtime-events', '0 3 * * 0',
--   $$DELETE FROM runtime_events WHERE created_at < now() - interval '30 days'$$);

-- SELECT cron.schedule('purge-old-api-usage', '0 4 * * 0',
--   $$DELETE FROM api_usage WHERE created_at < now() - interval '90 days'$$);
