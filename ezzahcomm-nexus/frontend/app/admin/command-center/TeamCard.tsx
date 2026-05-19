'use client';

import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  objective: string;
  lead_agent: string;
  members: string[];
  status: string;
  task_count: number;
  completed_tasks: number;
  created_at: string;
}

interface Props {
  team: Team;
  statusColors: Record<string, string>;
  taskCount: number;
}

const ROLE_ICONS: Record<string, string> = {
  architect:         '🏗',
  backend:           '⚙',
  frontend:          '🎨',
  devops:            '🚀',
  security:          '🔐',
  'qa-testing':      '🧪',
  'product-manager': '📋',
  'data-analyst':    '📊',
  documentation:     '📝',
  research:          '🔍',
  marketing:         '📣',
  analytics:         '📈',
  audit:             '🔎',
  support:           '💬',
  billing:           '💳',
  communication:     '📨',
  memory:            '🧠',
  automation:        '⚡',
};

export default function TeamCard({ team, statusColors, taskCount }: Props) {
  const completion = team.task_count > 0
    ? Math.round((team.completed_tasks / team.task_count) * 100)
    : 0;

  const statusClass = statusColors[team.status] ?? 'bg-slate-100 text-slate-500 border-slate-200';
  const elapsed = Math.round((Date.now() - new Date(team.created_at).getTime()) / 60_000);
  const elapsedLabel = elapsed < 60 ? `${elapsed}m ago` : `${Math.round(elapsed / 60)}h ago`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${statusClass}`}>
              {team.status}
            </span>
            <span className="text-slate-400 text-xs">{team.name}</span>
            <span className="text-slate-300 text-xs">·</span>
            <span className="text-slate-400 text-xs">{elapsedLabel}</span>
          </div>

          <p className="text-slate-900 text-sm font-medium leading-snug mb-3 line-clamp-2">
            {team.objective}
          </p>

          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            {team.members.map((role) => (
              <span
                key={role}
                title={role}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-600 text-xs"
              >
                <span>{ROLE_ICONS[role] ?? '🤖'}</span>
                <span>{role}</span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="text-slate-400 text-xs whitespace-nowrap">
              {team.completed_tasks}/{team.task_count} tasks · {completion}%
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {taskCount > 0 && (
            <span className="px-2 py-0.5 bg-violet-50 border border-violet-200 rounded-full text-violet-700 text-xs font-medium">
              {taskCount} queued
            </span>
          )}
          <Link
            href={`/admin/command-center/${team.id}`}
            className="text-xs text-slate-400 hover:text-blue-600 font-medium transition-colors"
          >
            View →
          </Link>
        </div>
      </div>
    </div>
  );
}
