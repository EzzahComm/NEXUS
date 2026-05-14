import { createClient } from '@/lib/supabase/server';
import AgentPicker from './AgentPicker';

const statusStyles: Record<string, string> = {
  idle:     'bg-white/8 text-white/50',
  busy:     'bg-[#00ff88]/10 text-[#00ff88]',
  error:    'bg-red-500/10 text-red-400',
  disabled: 'bg-white/5 text-white/20',
};

export default async function AgentsPage() {
  const supabase = await createClient();
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="text-white/40 text-sm mt-1">Autonomous agents running on your platform.</p>
        </div>
      </div>

      {!agents?.length ? (
        <AgentPicker />
      ) : (
        <div className="border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Runs</th>
                <th className="text-left px-5 py-3 font-medium">Last Run</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, i) => (
                <tr
                  key={agent.id}
                  className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i === agents.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-5 py-3.5 text-white font-medium">{agent.name}</td>
                  <td className="px-5 py-3.5 text-white/50">{agent.type}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[agent.status] ?? 'bg-white/8 text-white/50'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-white/50">{agent.run_count}</td>
                  <td className="px-5 py-3.5 text-white/30 text-xs">
                    {agent.last_run_at ? new Date(agent.last_run_at).toLocaleString() : '—'}
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
      <div className="w-12 h-12 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-[#00ff88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="text-white font-semibold mb-1">No agents yet</h2>
      <p className="text-white/40 text-sm">Agents will appear here once deployed to your platform.</p>
    </div>
  );
}
