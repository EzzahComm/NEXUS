-- ============================================================
-- EZZAHCOMM NEXUS — CORE SCHEMA MIGRATION
-- Memory Layer | Task Engine | Project Registry | Analytics
-- ============================================================

-- 1. USERS
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique,
  role text default 'user',
  created_at timestamp default now()
);

-- 2. PROJECTS
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  name text,
  description text,
  status text default 'active',
  owner_id uuid references users(id),
  created_at timestamp default now()
);

-- 3. TASKS
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id),
  title text,
  description text,
  status text default 'pending',
  priority text default 'medium',
  created_at timestamp default now(),
  completed_at timestamp
);

-- 4. NEXUS MEMORY
create table if not exists nexus_memory (
  id uuid primary key default uuid_generate_v4(),
  key text,
  value jsonb,
  context text,
  created_at timestamp default now()
);

-- 5. DEPLOYMENTS
create table if not exists deployments (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id),
  environment text,
  status text,
  logs text,
  created_at timestamp default now()
);

-- 6. MARKETING CAMPAIGNS
create table if not exists marketing_campaigns (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id),
  platform text,
  content text,
  performance jsonb,
  created_at timestamp default now()
);

-- 7. SYSTEM EVENTS
create table if not exists system_events (
  id uuid primary key default uuid_generate_v4(),
  event_type text,
  payload jsonb,
  severity text,
  created_at timestamp default now()
);

-- ============================================================
-- SECURITY — ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table projects enable row level security;
alter table tasks enable row level security;
alter table nexus_memory enable row level security;
alter table deployments enable row level security;
alter table marketing_campaigns enable row level security;
alter table system_events enable row level security;
