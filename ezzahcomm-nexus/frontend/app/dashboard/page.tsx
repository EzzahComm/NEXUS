import { createClient } from '@/lib/supabase/server';

async function getStats() {
  const supabase = await createClient();
  const [agents, tasks, workflows, alerts] = await Promise.all([
    supabase.from('agents').select('id, status', { count: 'exact' }),
    supabase.from('tasks').select('id, status', { count: 'exact' }),
    supabase.from('workflow_executions').select('id, status', { count: 'exact' }),
    supabase.from('system_alerts').select('id, severity', { count: 'exact' }),
  ]);

  const activeAgents = agents.data?.filter((a) => a.status === 'active').length ?? 0;
  const pendingTasks = tasks.data?.filter((t) => t.status === 'pending').length ?? 0;
  const runningWorkflows = workflows.data?.filter((w) => w.status === 'running').length ?? 0;
  const openAlerts = alerts.data?.filter((a) => a.severity !== 'resolved').length ?? 0;

  return {
    totalAgents: agents.count ?? 0,
    activeAgents,
    totalTasks: tasks.count ?? 0,
    pendingTasks,
    totalWorkflows: workflows.count ?? 0,
    runningWorkflows,
    openAlerts,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      label: 'Active Agents',
      value: stats.activeAgents,
      sub: `${stats.totalAgents} total`,
      accent: '#00ff88',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Pending Tasks',
      value: stats.pendingTasks,
      sub: `${stats.totalTasks} total`,
      accent: '#0066ff',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: 'Running Workflows',
      value: stats.runningWorkflows,
      sub: `${stats.totalWorkflows} total`,
      accent: '#a855f7',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: 'Open Alerts',
      value: stats.openAlerts,
      sub: 'system alerts',
      accent: '#f59e0b',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-white/40 text-sm mt-1">Your NEXUS platform at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map(({ label, value, sub, accent, icon }) => (
          <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{label}</span>
              <span style={{ color: accent }}>{icon}</span>
            </div>
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-white/30 text-xs mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* Empty state prompt */}
      {stats.totalAgents === 0 && (
        <div className="border border-dashed border-white/10 rounded-xl p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#00ff88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-white font-semibold mb-1">Deploy your first agent</h2>
          <p className="text-white/40 text-sm mb-5">
            NEXUS agents run autonomously to automate your business operations 24/7.
          </p>
          <a
            href="/dashboard/agents"
            className="inline-flex items-center gap-2 bg-[#00ff88] text-black text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#00e87a] transition-colors"
          >
            Create Agent
          </a>
        </div>
      )}
    </div>
  );
}
