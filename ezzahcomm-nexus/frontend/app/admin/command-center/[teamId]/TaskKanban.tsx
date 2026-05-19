'use client';

interface Task {
  id: string;
  task_type: string;
  status: string;
  priority: number;
  payload: Record<string, unknown>;
  retry_count: number;
  created_at: string;
  completed_at?: string;
}

interface Props {
  tasksByState: Record<string, Task[]>;
}

const STATE_COLUMNS = [
  { key: 'blocked',   label: 'Blocked',   color: 'text-orange-600',  bg: 'bg-orange-50  border-orange-200' },
  { key: 'pending',   label: 'Pending',   color: 'text-slate-500',   bg: 'bg-slate-50   border-slate-200' },
  { key: 'claimed',   label: 'Claimed',   color: 'text-amber-600',   bg: 'bg-amber-50   border-amber-200' },
  { key: 'active',    label: 'Active',    color: 'text-blue-600',    bg: 'bg-blue-50    border-blue-200' },
  { key: 'reviewing', label: 'Reviewing', color: 'text-violet-600',  bg: 'bg-violet-50  border-violet-200' },
  { key: 'completed', label: 'Done',      color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  { key: 'failed',    label: 'Failed',    color: 'text-red-600',     bg: 'bg-red-50     border-red-200' },
];

const ROLE_ICONS: Record<string, string> = {
  architect: '🏗', backend: '⚙', frontend: '🎨', devops: '🚀',
  security: '🔐', 'qa-testing': '🧪', 'product-manager': '📋',
  'data-analyst': '📊', documentation: '📝', research: '🔍',
  marketing: '📣', analytics: '📈', audit: '🔎', support: '💬',
  billing: '💳', communication: '📨', memory: '🧠', automation: '⚡',
};

const PRIORITY_LABEL: Record<number, string> = {
  1: 'critical', 2: 'high', 3: 'medium', 4: 'low',
};
const PRIORITY_COLOR: Record<number, string> = {
  1: 'text-red-600', 2: 'text-orange-600', 3: 'text-slate-400', 4: 'text-slate-300',
};

export default function TaskKanban({ tasksByState }: Props) {
  const visibleCols = STATE_COLUMNS.filter(
    (col) => (tasksByState[col.key]?.length ?? 0) > 0 ||
              ['pending', 'active', 'completed'].includes(col.key)
  );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {visibleCols.map(({ key, label, color, bg }) => {
          const tasks = tasksByState[key] ?? [];
          return (
            <div key={key} className="w-56 shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</span>
                <span className="text-slate-400 text-xs">{tasks.length}</span>
              </div>

              <div className={`rounded-xl border p-2 space-y-2 min-h-[80px] ${bg}`}>
                {tasks.length === 0 ? (
                  <div className="flex items-center justify-center h-10">
                    <span className="text-slate-300 text-xs">empty</span>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{ROLE_ICONS[task.task_type] ?? '🤖'}</span>
                          <span className="text-slate-900 text-xs font-medium truncate max-w-[80px]">
                            {task.task_type}
                          </span>
                        </div>
                        <span className={`text-xs shrink-0 font-medium ${PRIORITY_COLOR[task.priority] ?? 'text-slate-300'}`}>
                          {PRIORITY_LABEL[task.priority] ?? '—'}
                        </span>
                      </div>

                      {!!task.payload?.instruction && (
                        <p className="text-slate-500 text-xs line-clamp-2 leading-snug">
                          {String(task.payload.instruction).slice(0, 80)}
                        </p>
                      )}

                      {task.retry_count > 0 && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className="text-orange-600 text-xs">↩ retry {task.retry_count}</span>
                        </div>
                      )}

                      <p className="text-slate-300 text-xs mt-1.5 truncate font-mono">
                        {task.id.slice(0, 8)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
