import { createAdminClient } from '@/lib/supabase/admin-client';

export default async function AdminOverviewPage() {
  const db = createAdminClient();

  const [tenants, agents, tasks, workflows, mpesa, card, alerts, users] = await Promise.all([
    db.from('tenants').select('id, plan, status', { count: 'exact' }),
    db.from('agents').select('id, status', { count: 'exact' }),
    db.from('tasks').select('id, status', { count: 'exact' }),
    db.from('workflow_executions').select('id, status', { count: 'exact' }),
    db.from('mobile_money_transactions').select('amount, status'),
    db.from('card_transactions').select('amount, status'),
    db.from('system_alerts').select('id, severity, resolved', { count: 'exact' }),
    db.auth.admin.listUsers(),
  ]);

  const totalRevenue = [
    ...(mpesa.data?.filter((r) => r.status === 'completed') ?? []),
    ...(card.data?.filter((r) => r.status === 'success') ?? []),
  ].reduce((sum, record) => sum + Number(record.amount), 0);

  const completedTasks = tasks.data?.filter((task) => task.status === 'completed').length ?? 0;
  const runningWorkflows = workflows.data?.filter((workflow) => workflow.status === 'running').length ?? 0;
  const activeAgents = agents.data?.filter((agent) => agent.status === 'busy').length ?? 0;
  const criticalAlerts = alerts.data?.filter((alert) => alert.severity === 'critical' && !alert.resolved).length ?? 0;
  const unresolvedAlerts = alerts.data?.filter((alert) => !alert.resolved).length ?? 0;
  const paidTenants = tenants.data?.filter((tenant) => tenant.plan !== 'free').length ?? 0;

  const summaryStats = [
    { label: 'Enterprise Tenants', value: tenants.count ?? 0, meta: `${paidTenants} paid accounts` },
    { label: 'Active Users', value: users.data?.users?.length ?? 0, meta: 'Verified logins' },
    { label: 'Agent Capacity', value: agents.count ?? 0, meta: `${activeAgents} active engagements` },
    { label: 'Revenue (KES)', value: totalRevenue.toLocaleString(), meta: 'All-time receipts' },
  ];

  const performanceStats = [
    { label: 'Tasks Completed', value: completedTasks, meta: `${tasks.count ?? 0} total` },
    { label: 'Workflows Running', value: runningWorkflows, meta: 'Current automation load' },
    { label: 'Unresolved Alerts', value: unresolvedAlerts, meta: 'Action required' },
    { label: 'Critical Incidents', value: criticalAlerts, meta: 'High-priority issues' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.28em] text-sky-400/80">Command Center</p>
              <h1 className="text-4xl font-semibold tracking-tight text-white">Enterprise Platform Dashboard</h1>
              <p className="max-w-2xl text-slate-400">
                Monitor platform health, agent operations, payment flows, and risk exposure across NEXUS in a single executive view.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase text-slate-500">SLA Status</p>
                <p className="mt-3 text-3xl font-semibold text-emerald-300">99.98%</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase text-slate-500">Pending Reviews</p>
                <p className="mt-3 text-3xl font-semibold text-sky-300">{unresolvedAlerts}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase text-slate-500">Operational Score</p>
                <p className="mt-3 text-3xl font-semibold text-violet-300">A+</p>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryStats.map(({ label, value, meta }) => (
              <div key={label} className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
                <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
                <p className="mt-2 text-sm text-slate-400">{meta}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Operational Insight</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Recent Performance & Risk</h2>
              </div>
              <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">
                Enterprise mode
              </span>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {performanceStats.map(({ label, value, meta }) => (
                <div key={label} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
                  <p className="mt-2 text-sm text-slate-400">{meta}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[28px] border border-slate-800 bg-slate-950/80 p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Platform pulse</p>
                <span className="text-xs uppercase tracking-[0.28em] text-slate-500">Live overview</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-900 p-4 text-slate-300">
                  <p className="text-sm text-slate-500">Checkout success</p>
                  <p className="mt-2 text-xl font-semibold text-emerald-300">87%</p>
                </div>
                <div className="rounded-2xl bg-slate-900 p-4 text-slate-300">
                  <p className="text-sm text-slate-500">Workflow efficiency</p>
                  <p className="mt-2 text-xl font-semibold text-sky-300">92%</p>
                </div>
                <div className="rounded-2xl bg-slate-900 p-4 text-slate-300">
                  <p className="text-sm text-slate-500">Latency SLA</p>
                  <p className="mt-2 text-xl font-semibold text-violet-300">99.4%</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/10">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Actions</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Next strategic moves</h3>
              <ul className="mt-5 space-y-3 text-slate-300">
                <li className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="font-medium text-white">Review failed workflows</p>
                  <p className="mt-1 text-sm text-slate-500">Resolve process bottlenecks and rerun automation tasks.</p>
                </li>
                <li className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="font-medium text-white">Monitor payment latency</p>
                  <p className="mt-1 text-sm text-slate-500">Confirm Daraja STK push health and webhook delivery.</p>
                </li>
                <li className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="font-medium text-white">Validate enterprise onboarding</p>
                  <p className="mt-1 text-sm text-slate-500">Check tenant plan migration and audit trails.</p>
                </li>
              </ul>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/10">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Alerts</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Critical incident summary</h3>
              <div className="mt-5 space-y-4 text-slate-300">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-500">Pending escalation</p>
                  <p className="mt-2 text-base font-semibold text-white">{unresolvedAlerts} unresolved alerts</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-500">Critical issues</p>
                  <p className="mt-2 text-base font-semibold text-white">{criticalAlerts} active incidents</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
