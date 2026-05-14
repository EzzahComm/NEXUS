import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin-client';

const statusStyles: Record<string, string> = {
  active:    'bg-[#00ff88]/10 text-[#00ff88]',
  paused:    'bg-[#f59e0b]/10 text-[#f59e0b]',
  completed: 'bg-white/8 text-white/40',
  cancelled: 'bg-red-500/10 text-red-400',
};

export default async function AdminProjectsPage() {
  const db = createAdminClient();
  const { data: projects } = await db
    .from('projects')
    .select('*, tenants(name, email)')
    .order('created_at', { ascending: false });

  const agentCounts = await (async () => {
    if (!projects?.length) return {} as Record<string, number>;
    const { data } = await db
      .from('agents')
      .select('project_id')
      .in('project_id', projects.map(p => p.id));
    const counts: Record<string, number> = {};
    for (const a of data ?? []) {
      if (a.project_id) counts[a.project_id] = (counts[a.project_id] ?? 0) + 1;
    }
    return counts;
  })();

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-white/40 text-sm mt-1">
            {projects?.length ?? 0} admin-initiated projects across all tenants.
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {!projects?.length ? (
        <div className="border border-dashed border-white/10 rounded-xl p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <p className="text-white font-medium text-sm">No projects yet</p>
          <p className="text-white/30 text-sm mt-1 mb-5">Initiate a project by picking a user and deploying agents on their behalf.</p>
          <Link href="/admin/projects/new" className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors">
            Start first project
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map(p => {
            const tenant = p.tenants as { name: string; email: string } | null;
            const count = agentCounts[p.id] ?? 0;
            return (
              <div key={p.id} className="border border-white/8 rounded-xl p-5 hover:border-white/15 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-white font-semibold text-sm truncate">{p.name}</h2>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[p.status] ?? 'bg-white/8 text-white/40'}`}>
                        {p.status}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-white/40 text-xs truncate mb-2">{p.description}</p>
                    )}
                    {p.needs && (
                      <p className="text-white/30 text-xs line-clamp-2 mb-3">{p.needs}</p>
                    )}
                    <div className="flex items-center gap-5 text-xs text-white/25">
                      <span>
                        <span className="text-white/50">{tenant?.name ?? tenant?.email ?? '—'}</span>
                      </span>
                      <span>{count} agent{count !== 1 ? 's' : ''} deployed</span>
                      <span>by {p.initiated_by}</span>
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg">
                      <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-white/50 font-medium">{count}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
