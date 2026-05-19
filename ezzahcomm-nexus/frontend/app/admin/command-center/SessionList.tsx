'use client';

interface Session {
  session_id: string;
  agent_type: string;
  team_id: string | null;
  status: string;
  model: string;
  started_at: string;
  last_heartbeat: string;
}

const ROLE_ICONS: Record<string, string> = {
  architect: '🏗', backend: '⚙', frontend: '🎨', devops: '🚀',
  security: '🔐', 'qa-testing': '🧪', 'product-manager': '📋',
  'data-analyst': '📊', documentation: '📝', research: '🔍',
  marketing: '📣', analytics: '📈', audit: '🔎', support: '💬',
  billing: '💳', communication: '📨', memory: '🧠', automation: '⚡',
};

const STATUS_DOT: Record<string, string> = {
  active: 'bg-emerald-500',
  busy:   'bg-amber-500',
  idle:   'bg-slate-300',
};

const STATUS_TEXT: Record<string, string> = {
  active: 'text-emerald-600',
  busy:   'text-amber-600',
  idle:   'text-slate-400',
};

function elapsedLabel(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  return `${Math.floor(secs / 3600)}h`;
}

export default function SessionList({ sessions }: { sessions: Session[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {sessions.map((s) => (
        <div
          key={s.session_id}
          className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-sm"
        >
          <div className="relative shrink-0">
            <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-lg">
              {ROLE_ICONS[s.agent_type] ?? '🤖'}
            </span>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${STATUS_DOT[s.status] ?? 'bg-slate-300'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-slate-900 text-sm font-medium truncate">{s.agent_type}</p>
            <p className="text-slate-400 text-xs truncate">{s.model}</p>
            {s.team_id && (
              <p className="text-violet-600/70 text-xs truncate mt-0.5">
                team: {s.team_id.slice(0, 8)}
              </p>
            )}
          </div>

          <div className="text-right shrink-0">
            <span className={`block text-xs font-medium capitalize ${STATUS_TEXT[s.status] ?? 'text-slate-400'}`}>
              {s.status}
            </span>
            <span className="text-slate-400 text-xs block mt-0.5">{elapsedLabel(s.started_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
