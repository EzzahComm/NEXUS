import { createClient } from '@/lib/supabase/server';

export default async function UsagePage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('api_usage')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const total = rows?.length ?? 0;
  const errors = rows?.filter((r) => r.status_code >= 400).length ?? 0;
  const avgMs = total
    ? Math.round(rows!.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / total)
    : 0;
  const successRate = total ? (((total - errors) / total) * 100).toFixed(1) : '—';

  const stats = [
    { label: 'Total Requests', value: total },
    { label: 'Avg Latency', value: total ? `${avgMs}ms` : '—' },
    { label: 'Error Count', value: errors },
    { label: 'Success Rate', value: `${successRate}%` },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">API Usage</h1>
        <p className="text-white/40 text-sm mt-1">Request logs and performance metrics.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-5">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {!rows?.length ? (
        <Empty />
      ) : (
        <div className="border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Endpoint</th>
                <th className="text-left px-5 py-3 font-medium">Method</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Duration</th>
                <th className="text-left px-5 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i === rows.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-5 py-3.5 text-white/70 font-mono text-xs truncate max-w-xs">{row.endpoint}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-semibold text-white/50">{row.method}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-bold ${row.status_code < 400 ? 'text-[#00ff88]' : 'text-red-400'}`}>
                      {row.status_code}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-white/40 text-xs">{row.duration_ms}ms</td>
                  <td className="px-5 py-3.5 text-white/30 text-xs">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="border border-dashed border-white/10 rounded-xl p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h2 className="text-white font-semibold mb-1">No API requests logged yet</h2>
      <p className="text-white/40 text-sm">Usage data will appear once your API starts receiving traffic.</p>
    </div>
  );
}
