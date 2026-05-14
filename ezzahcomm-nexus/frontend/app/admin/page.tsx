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
    ...(mpesa.data?.filter(r => r.status === 'completed') ?? []),
    ...(card.data?.filter(r => r.status === 'success') ?? []),
  ].reduce((s, r) => s + Number(r.amount), 0);

  const stats = [
    { label: 'Tenants', value: tenants.count ?? 0, sub: `${tenants.data?.filter(t => t.plan !== 'free').length ?? 0} paid` },
    { label: 'Total Users', value: users.data?.users?.length ?? 0, sub: 'registered accounts' },
    { label: 'Agents', value: agents.count ?? 0, sub: `${agents.data?.filter(a => a.status === 'busy').length ?? 0} active` },
    { label: 'Revenue (KES)', value: `${totalRevenue.toLocaleString()}`, sub: 'all time' },
    { label: 'Tasks Run', value: tasks.count ?? 0, sub: `${tasks.data?.filter(t => t.status === 'failed').length ?? 0} failed` },
    { label: 'Workflows', value: workflows.count ?? 0, sub: `${workflows.data?.filter(w => w.status === 'running').length ?? 0} running` },
    { label: 'Open Alerts', value: alerts.data?.filter(a => !a.resolved).length ?? 0, sub: 'unresolved' },
    { label: 'Critical', value: alerts.data?.filter(a => a.severity === 'critical' && !a.resolved).length ?? 0, sub: 'critical alerts' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-semibold uppercase tracking-wider">
          Super Admin
        </span>
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub }) => (
          <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-5">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-white/30 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
