-- =============================================================================
-- NEXUS MULTI-AGENT TEAMS — Schema Migration
-- Adds: agent_teams, agent_sessions, task_dependencies
-- Upgrades: tasks table with team context, dependency tracking, full state machine
-- =============================================================================

-- ── AGENT TEAMS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  objective       TEXT NOT NULL,
  lead_agent      TEXT NOT NULL,
  members         TEXT[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'forming'
                    CHECK (status IN ('forming','active','reviewing','completed','dissolved','failed')),
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  tenant_id       UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_count      INT NOT NULL DEFAULT 0,
  completed_tasks INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_teams_tenant   ON public.agent_teams (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_teams_status   ON public.agent_teams (status);
CREATE INDEX IF NOT EXISTS idx_agent_teams_project  ON public.agent_teams (project_id);

-- RLS
ALTER TABLE public.agent_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_teams_tenant_read ON public.agent_teams
  FOR SELECT USING ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.tenants WHERE id = tenant_id
  ));

CREATE POLICY agent_teams_service_all ON public.agent_teams
  FOR ALL USING (current_setting('role') = 'service_role');

-- ── AGENT SESSIONS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      TEXT NOT NULL UNIQUE,
  agent_type      TEXT NOT NULL,
  team_id         UUID REFERENCES public.agent_teams(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('idle','active','busy','offline')),
  model           TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  current_task_id UUID,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  last_heartbeat  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_team   ON public.agent_sessions (team_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON public.agent_sessions (status);

ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_sessions_service_all ON public.agent_sessions
  FOR ALL USING (current_setting('role') = 'service_role');

-- ── TASK DEPENDENCY GRAPH ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on  UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, depends_on)
);

CREATE INDEX IF NOT EXISTS idx_task_deps_task       ON public.task_dependencies (task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_depends_on ON public.task_dependencies (depends_on);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_deps_service_all ON public.task_dependencies
  FOR ALL USING (current_setting('role') = 'service_role');

-- ── UPGRADE: tasks table ──────────────────────────────────────────────────────
-- Add new columns for multi-agent orchestration

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS team_id         UUID REFERENCES public.agent_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_by      TEXT,
  ADD COLUMN IF NOT EXISTS claimed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dependencies    UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS blocked_by      UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS retry_count     INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries     INT NOT NULL DEFAULT 3;

-- Extend status check to include new states
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending','claimed','blocked','active','reviewing','failed','completed','archived'));

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tasks_team_id   ON public.tasks (team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_claimed   ON public.tasks (claimed_at) WHERE status = 'claimed';

-- ── AGENT MESSAGES (audit trail) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent     TEXT NOT NULL,
  to_agent       TEXT NOT NULL,
  message_type   TEXT NOT NULL,
  payload        JSONB NOT NULL DEFAULT '{}',
  team_id        UUID REFERENCES public.agent_teams(id) ON DELETE SET NULL,
  correlation_id TEXT,
  priority       TEXT NOT NULL DEFAULT 'normal',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_team    ON public.agent_messages (team_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_from    ON public.agent_messages (from_agent);
CREATE INDEX IF NOT EXISTS idx_agent_messages_to      ON public.agent_messages (to_agent);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created ON public.agent_messages (created_at DESC);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_messages_service_all ON public.agent_messages
  FOR ALL USING (current_setting('role') = 'service_role');

-- ── HELPER: increment integer column ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment(x INT)
RETURNS INT LANGUAGE SQL IMMUTABLE AS $$
  SELECT x + 1
$$;

-- ── HELPER: match_memory (pgvector) — ensure exists ───────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_memory') THEN
    EXECUTE $func$
      CREATE FUNCTION public.match_memory(
        query_embedding    vector(1536),
        match_threshold    FLOAT,
        match_count        INT,
        tenant_id_filter   UUID DEFAULT NULL
      )
      RETURNS TABLE (
        id          UUID,
        key         TEXT,
        value       JSONB,
        context     TEXT,
        similarity  FLOAT,
        created_at  TIMESTAMPTZ
      )
      LANGUAGE plpgsql AS $body$
      BEGIN
        RETURN QUERY
        SELECT
          m.id, m.key, m.value, m.context,
          1 - (m.embedding <=> query_embedding) AS similarity,
          m.created_at
        FROM public.nexus_memory m
        WHERE (tenant_id_filter IS NULL OR m.tenant_id = tenant_id_filter)
          AND 1 - (m.embedding <=> query_embedding) > match_threshold
        ORDER BY m.embedding <=> query_embedding
        LIMIT match_count;
      END
      $body$
    $func$;
  END IF;
END $$;

-- ── VIEWS ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_team_overview AS
SELECT
  t.id,
  t.name,
  t.objective,
  t.lead_agent,
  t.members,
  t.status,
  t.task_count,
  t.completed_tasks,
  CASE WHEN t.task_count > 0
    THEN ROUND((t.completed_tasks::NUMERIC / t.task_count) * 100)
    ELSE 0 END AS completion_pct,
  t.tenant_id,
  t.project_id,
  t.created_at,
  t.completed_at
FROM public.agent_teams t;

CREATE OR REPLACE VIEW public.v_active_sessions AS
SELECT
  s.session_id,
  s.agent_type,
  s.team_id,
  s.status,
  s.model,
  s.started_at,
  s.last_heartbeat,
  EXTRACT(EPOCH FROM (NOW() - s.started_at))::INT AS uptime_secs
FROM public.agent_sessions s
WHERE s.status != 'offline';
