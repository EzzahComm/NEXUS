import { createAdminClient } from '@/lib/supabase/admin-client';

export default async function AdminLogsPage() {
  const db = createAdminClient();
  const { data: logs } = await db
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="text-white/40 text-sm mt-1">Full record of all platform actions.</p>
      </div>

      {!logs?.length ? (
        <p className="text-white/30 text-sm">No audit events recorded yet.</p>
      ) : (
        <div className="border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Actor</th>
                <th className="text-left px-5 py-3 font-medium">Action</th>
                <th className="text-left px-5 py-3 font-medium">Resource</th>
                <th className="text-left px-5 py-3 font-medium">IP</th>
                <th className="text-left px-5 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l.id} className={`border-b border-white/5 hover:bg-white/3 ${i === logs.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-5 py-3.5 text-white/60 text-xs">{l.actor_email ?? l.actor_id ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-[#00ff88] bg-[#00ff88]/5 px-2 py-0.5 rounded">{l.action}</span>
                  </td>
                  <td className="px-5 py-3.5 text-white/50 text-xs">{l.resource}{l.resource_id ? ` · ${l.resource_id.slice(0, 8)}…` : ''}</td>
                  <td className="px-5 py-3.5 text-white/30 text-xs font-mono">{l.ip_address ?? '—'}</td>
                  <td className="px-5 py-3.5 text-white/30 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
