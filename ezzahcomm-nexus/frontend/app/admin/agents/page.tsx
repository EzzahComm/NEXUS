import { createAdminClient } from '@/lib/supabase/admin-client';

const statusStyles: Record<string, string> = {
  idle:     'bg-white/8 text-white/50',
  busy:     'bg-[#00ff88]/10 text-[#00ff88]',
  error:    'bg-red-500/10 text-red-400',
  disabled: 'bg-white/5 text-white/20',
};

export default async function AdminAgentsPage() {
  const db = createAdminClient();
  const { data: agents } = await db
    .from('agents')
    .select('*, tenants(name, email)')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">All Agents</h1>
        <p className="text-white/40 text-sm mt-1">{agents?.length ?? 0} agents across all tenants.</p>
      </div>

      {!agents?.length ? (
        <p className="text-white/30 text-sm">No agents deployed yet.</p>
      ) : (
        <div className="border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Agent</th>
                <th className="text-left px-5 py-3 font-medium">Tenant</th>
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Runs</th>
                <th className="text-left px-5 py-3 font-medium">Last Run</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a, i) => (
                <tr key={a.id} className={`border-b border-white/5 hover:bg-white/3 ${i === agents.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-5 py-3.5 text-white font-medium">{a.name}</td>
                  <td className="px-5 py-3.5 text-white/40 text-xs">{(a.tenants as {name:string})?.name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-white/50">{a.type}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[a.status] ?? 'bg-white/8 text-white/50'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />{a.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-white/50">{a.run_count}</td>
                  <td className="px-5 py-3.5 text-white/30 text-xs">{a.last_run_at ? new Date(a.last_run_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
