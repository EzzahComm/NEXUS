import { createAdminClient } from '@/lib/supabase/admin-client';

const severityStyles: Record<string, string> = {
  info:     'bg-[#0066ff]/10 text-[#0066ff]',
  warning:  'bg-[#f59e0b]/10 text-[#f59e0b]',
  critical: 'bg-red-500/10 text-red-400',
};

export default async function AdminAlertsPage() {
  const db = createAdminClient();
  const { data: alerts } = await db
    .from('system_alerts')
    .select('*')
    .order('created_at', { ascending: false });

  const open = alerts?.filter(a => !a.resolved).length ?? 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">System Alerts</h1>
        <p className="text-white/40 text-sm mt-1">{open} open · {alerts?.length ?? 0} total</p>
      </div>

      {!alerts?.length ? (
        <div className="border border-dashed border-white/10 rounded-xl p-12 text-center">
          <p className="text-[#00ff88] text-sm font-medium">All clear — no alerts.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map(a => (
            <div key={a.id} className={`border rounded-xl p-5 ${a.resolved ? 'border-white/5 opacity-50' : 'border-white/8'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${severityStyles[a.severity] ?? 'bg-white/8 text-white/50'}`}>
                    {a.severity}
                  </span>
                  <p className="text-white font-medium text-sm">{a.title}</p>
                </div>
                {a.resolved && <span className="text-[#00ff88] text-xs shrink-0">Resolved</span>}
              </div>
              <p className="text-white/50 text-sm mt-2">{a.message}</p>
              <div className="flex items-center gap-4 mt-3 text-white/25 text-xs">
                <span>Source: {a.source}</span>
                <span>{new Date(a.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
