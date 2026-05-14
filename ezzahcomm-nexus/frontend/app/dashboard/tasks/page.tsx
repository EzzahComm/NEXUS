import { createClient } from '@/lib/supabase/server';

const statusStyles: Record<string, string> = {
  pending:     'bg-[#f59e0b]/10 text-[#f59e0b]',
  in_progress: 'bg-[#0066ff]/10 text-[#0066ff]',
  completed:   'bg-[#00ff88]/10 text-[#00ff88]',
  failed:      'bg-red-500/10 text-red-400',
  cancelled:   'bg-white/8 text-white/30',
};

const priorityStyles: Record<string, string> = {
  critical: 'text-red-400',
  high:     'text-[#f59e0b]',
  medium:   'text-white/50',
  low:      'text-white/30',
};

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-white/40 text-sm mt-1">All task executions across your agents.</p>
        </div>
      </div>

      {!tasks?.length ? (
        <Empty />
      ) : (
        <div className="border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Title / Type</th>
                <th className="text-left px-5 py-3 font-medium">Priority</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, i) => (
                <tr
                  key={task.id}
                  className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i === tasks.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-5 py-3.5">
                    <p className="text-white font-medium">{task.title ?? '—'}</p>
                    <p className="text-white/30 text-xs mt-0.5">{task.task_type}</p>
                  </td>
                  <td className={`px-5 py-3.5 text-xs font-medium uppercase tracking-wider ${priorityStyles[task.priority] ?? 'text-white/50'}`}>
                    {task.priority}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[task.status] ?? 'bg-white/8 text-white/50'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-white/30 text-xs">
                    {new Date(task.created_at).toLocaleString()}
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
      <div className="w-12 h-12 rounded-full bg-[#0066ff]/10 border border-[#0066ff]/20 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-[#0066ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <h2 className="text-white font-semibold mb-1">No tasks yet</h2>
      <p className="text-white/40 text-sm">Tasks will appear here as your agents execute work.</p>
    </div>
  );
}
