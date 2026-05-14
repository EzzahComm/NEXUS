import { createAdminClient } from '@/lib/supabase/admin-client';

const statusStyles: Record<string, string> = {
  idle:     'bg-white/8 text-white/50',
  busy:     'bg-[#00ff88]/10 text-[#00ff88]',
  error:    'bg-red-500/10 text-red-400',
  disabled: 'bg-white/5 text-white/20',
};

const typeLabel: Record<string, string> = {
  customer_support:  'Support',
  sales_outreach:    'Sales',
  data_analyst:      'Analytics',
  content_creator:   'Content',
  ops_automation:    'Ops',
  finance_monitor:   'Finance',
  web_dev_fullstack: 'Web · Full-Stack',
  web_dev_frontend:  'Web · Frontend',
  web_dev_backend:   'Web · Backend',
  web_dev_integrations: 'Web · Integrations',
};

export default async function AdminAgentsPage() {
  const db = createAdminClient();
  const { data: agents } = await db
    .from('agents')
    .select('*, tenants(name, email), projects(name)')
    .order('created_at', { ascending: false });

  const active = agents?.filter(a => a.status === 'busy').length ?? 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">All Agents</h1>
        <p className="text-white/40 text-sm mt-1">
          {agents?.length ?? 0} agents · {active} active now
        </p>
      </div>

      {!agents?.length ? (
        <p className="text-white/30 text-sm">No agents deployed yet.</p>
      ) : (
        <div className="border border-white/8 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Agent</th>
                <th className="text-left px-5 py-3 font-medium">Tenant</th>
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Project</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-right px-5 py-3 font-medium">Runs</th>
                <th className="text-left px-5 py-3 font-medium">Last Run</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a, i) => {
                const tenant  = a.tenants  as { name: string; email: string } | null;
                const project = a.projects as { name: string } | null;
                return (
                  <tr key={a.id} className={`border-b border-white/5 hover:bg-white/3 ${i === agents.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-5 py-3.5 text-white font-medium whitespace-nowrap">{a.name}</td>
                    <td className="px-5 py-3.5 text-white/40 text-xs">
                      {tenant?.name ?? tenant?.email ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">
                        {typeLabel[a.type] ?? a.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-white/30 text-xs max-w-[140px] truncate">
                      {project?.name ?? <span className="text-white/15">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[a.status] ?? 'bg-white/8 text-white/50'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full bg-current ${a.status === 'busy' ? 'animate-pulse' : ''}`} />
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-white/50 tabular-nums">{a.run_count}</td>
                    <td className="px-5 py-3.5 text-white/30 text-xs whitespace-nowrap">
                      {a.last_run_at ? new Date(a.last_run_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
