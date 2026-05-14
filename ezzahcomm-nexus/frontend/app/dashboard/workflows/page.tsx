import { createClient } from '@/lib/supabase/server';

const statusStyles: Record<string, string> = {
  running:   'bg-[#0066ff]/10 text-[#0066ff]',
  completed: 'bg-[#00ff88]/10 text-[#00ff88]',
  failed:    'bg-red-500/10 text-red-400',
  cancelled: 'bg-white/8 text-white/30',
};

function duration(start: string, end: string | null) {
  if (!end) return 'Running…';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default async function WorkflowsPage() {
  const supabase = await createClient();
  const { data: executions } = await supabase
    .from('workflow_executions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(100);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflows</h1>
          <p className="text-white/40 text-sm mt-1">Execution history for all workflows.</p>
        </div>
      </div>

      {!executions?.length ? (
        <Empty />
      ) : (
        <div className="border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Workflow</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Duration</th>
                <th className="text-left px-5 py-3 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((ex, i) => (
                <tr
                  key={ex.id}
                  className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i === executions.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-5 py-3.5">
                    <p className="text-white font-medium font-mono text-xs">{ex.workflow_id}</p>
                    {ex.error && <p className="text-red-400 text-xs mt-0.5 truncate max-w-xs">{ex.error}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[ex.status] ?? 'bg-white/8 text-white/50'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {ex.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-white/50 text-xs">
                    {duration(ex.started_at, ex.completed_at)}
                  </td>
                  <td className="px-5 py-3.5 text-white/30 text-xs">
                    {new Date(ex.started_at).toLocaleString()}
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
      <div className="w-12 h-12 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/20 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-[#a855f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </div>
      <h2 className="text-white font-semibold mb-1">No workflow executions yet</h2>
      <p className="text-white/40 text-sm">Executions will appear here as workflows are triggered.</p>
    </div>
  );
}
