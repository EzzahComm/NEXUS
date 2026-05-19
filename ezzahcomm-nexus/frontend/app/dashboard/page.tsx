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
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
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
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
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
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
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
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
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
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Your NEXUS platform at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map(({ label, value, sub, iconBg, iconColor, icon }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">{label}</span>
              <span className={`w-9 h-9 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}>{icon}</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{value}</div>
            <div className="text-slate-400 text-xs mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {stats.totalAgents === 0 && (
        <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center bg-white">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-slate-900 font-semibold mb-1">Deploy your first agent</h2>
          <p className="text-slate-500 text-sm mb-5">
            NEXUS agents run autonomously to automate your business operations 24/7.
          </p>
          <a
            href="/dashboard/agents"
            className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Agent
          </a>
        </div>
      )}
    </div>
  );
}
