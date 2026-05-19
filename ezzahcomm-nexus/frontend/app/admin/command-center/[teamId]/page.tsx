import { createAdminClient } from '@/lib/supabase/admin-client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import TaskKanban from './TaskKanban';
import LiveEventsFeed from './LiveEventsFeed';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ teamId: string }>;
}

const ROLE_ICONS: Record<string, string> = {
  architect: '🏗', backend: '⚙', frontend: '🎨', devops: '🚀',
  security: '🔐', 'qa-testing': '🧪', 'product-manager': '📋',
  'data-analyst': '📊', documentation: '📝', research: '🔍',
  marketing: '📣', analytics: '📈', audit: '🔎', support: '💬',
  billing: '💳', communication: '📨', memory: '🧠', automation: '⚡',
};

const STATUS_BADGE: Record<string, string> = {
  forming:   'bg-amber-50 text-amber-700 border-amber-200',
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  reviewing: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-slate-100 text-slate-500 border-slate-200',
  dissolved: 'bg-slate-100 text-slate-400 border-slate-200',
  failed:    'bg-red-50 text-red-700 border-red-200',
};

export default async function TeamDetailPage({ params }: PageProps) {
  const { teamId } = await params;
  const db = createAdminClient();

  const [teamRes, tasksRes] = await Promise.all([
    db.from('agent_teams').select('*').eq('id', teamId).single(),
    db
      .from('tasks')
      .select('*')
      .eq('team_id', teamId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (teamRes.error || !teamRes.data) notFound();

  const team = teamRes.data;
  const tasks = tasksRes.data ?? [];

  const completion = team.task_count > 0
    ? Math.round((team.completed_tasks / team.task_count) * 100)
    : 0;

  const tasksByState = {
    pending:   tasks.filter(t => t.status === 'pending'),
    claimed:   tasks.filter(t => t.status === 'claimed'),
    active:    tasks.filter(t => t.status === 'active'),
    blocked:   tasks.filter(t => t.status === 'blocked'),
    reviewing: tasks.filter(t => t.status === 'reviewing'),
    completed: tasks.filter(t => t.status === 'completed'),
    failed:    tasks.filter(t => t.status === 'failed'),
  };

  return (
    <div className="p-8 space-y-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/admin/command-center" className="hover:text-slate-600 transition-colors">
          Command Center
        </Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">{team.name}</span>
      </div>

      {/* Team header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-full border text-xs font-medium ${STATUS_BADGE[team.status] ?? STATUS_BADGE.active}`}>
                {team.status}
              </span>
              <span className="text-slate-400 text-xs font-mono">{team.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">{team.name}</h1>
            <p className="text-slate-500 text-sm">{team.objective}</p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-3xl font-bold text-slate-900">{completion}%</p>
            <p className="text-slate-400 text-xs">{team.completed_tasks}/{team.task_count} tasks</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>

        {/* Agent roster */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 text-xs">Lead:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 border border-violet-200 rounded-full text-violet-700 text-xs font-medium">
            {ROLE_ICONS[team.lead_agent] ?? '🤖'} {team.lead_agent}
          </span>
          <span className="text-slate-300 text-xs">·</span>
          <span className="text-slate-400 text-xs">Team:</span>
          {(team.members as string[])
            .filter(m => m !== team.lead_agent)
            .map((role) => (
              <span key={role} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-600 text-xs">
                {ROLE_ICONS[role] ?? '🤖'} {role}
              </span>
            ))}
        </div>
      </div>

      {/* Task Kanban */}
      <div>
        <h2 className="text-slate-900 font-semibold mb-4">Task Graph</h2>
        <TaskKanban tasksByState={tasksByState} />
      </div>

      {/* Live Events Feed */}
      <div>
        <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
          Live Event Feed
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </h2>
        <LiveEventsFeed teamId={teamId} />
      </div>

    </div>
  );
}
