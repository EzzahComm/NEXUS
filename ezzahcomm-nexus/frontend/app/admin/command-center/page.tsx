import { createAdminClient } from '@/lib/supabase/admin-client';
import OrchestrateForm from './OrchestrateForm';
import TeamCard from './TeamCard';
import SessionList from './SessionList';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getCommandCenterData() {
  const db = createAdminClient();

  const [teamsRes, sessionsRes, tasksRes] = await Promise.all([
    db
      .from('agent_teams')
      .select('*')
      .in('status', ['forming', 'active', 'reviewing'])
      .order('created_at', { ascending: false })
      .limit(20),
    db
      .from('agent_sessions')
      .select('*')
      .neq('status', 'offline')
      .order('started_at', { ascending: false })
      .limit(30),
    db
      .from('tasks')
      .select('id, status, task_type, team_id, priority, created_at')
      .in('status', ['pending', 'claimed', 'active', 'blocked'])
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return {
    teams: teamsRes.data ?? [],
    sessions: sessionsRes.data ?? [],
    activeTasks: tasksRes.data ?? [],
  };
}

const STATUS_COLORS: Record<string, string> = {
  forming:   'bg-amber-50 text-amber-700 border-amber-200',
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  reviewing: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-slate-100 text-slate-500 border-slate-200',
  dissolved: 'bg-slate-100 text-slate-400 border-slate-200',
  failed:    'bg-red-50 text-red-700 border-red-200',
};

export default async function CommandCenterPage() {
  const { teams, sessions, activeTasks } = await getCommandCenterData();

  const stats = [
    { label: 'Active Teams',  value: teams.filter(t => t.status === 'active').length,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Forming',       value: teams.filter(t => t.status === 'forming').length,  iconBg: 'bg-amber-50',   iconColor: 'text-amber-600' },
    { label: 'Live Sessions', value: sessions.length,    iconBg: 'bg-blue-50',   iconColor: 'text-blue-600' },
    { label: 'Queue Depth',   value: activeTasks.length, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
  ];

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-1 bg-violet-50 border border-violet-200 rounded-full text-violet-700 text-xs font-semibold uppercase tracking-wider">
              Command Center
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-600 text-xs font-medium">Live</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">NEXUS Command Center</h1>
          <p className="text-slate-500 text-sm mt-1">Autonomous multi-agent orchestration platform</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, iconBg, iconColor }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-3">{label}</p>
            <p className={`text-3xl font-bold ${iconColor}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Orchestrate panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-slate-900 font-semibold mb-1">Orchestrate New Objective</h2>
        <p className="text-slate-500 text-sm mb-5">
          NEXUS will plan the team composition, build a task graph, and execute autonomously.
        </p>
        <OrchestrateForm />
      </div>

      {/* Active Teams */}
      <div>
        <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
          Active Teams
          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-500 text-xs">{teams.length}</span>
        </h2>

        {teams.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 text-sm">
            No active teams. Use the Orchestrate panel above to create your first agent team.
          </div>
        ) : (
          <div className="grid gap-4">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                statusColors={STATUS_COLORS}
                taskCount={activeTasks.filter(t => t.team_id === team.id).length}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active Sessions */}
      {sessions.length > 0 && (
        <div>
          <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
            Live Agent Sessions
            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-600 text-xs">{sessions.length} online</span>
          </h2>
          <SessionList sessions={sessions} />
        </div>
      )}

    </div>
  );
}
