import { createAdminClient } from '@/lib/supabase/admin-client';
import NewProjectForm from './NewProjectForm';

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const db = createAdminClient();
  const params = await searchParams;

  const [{ data: tenants }, { data: authUsers }] = await Promise.all([
    db.from('tenants').select('id, name, email').order('created_at', { ascending: false }),
    db.auth.admin.listUsers({ perPage: 500 }),
  ]);

  // Merge: tenants that exist in DB, plus auth users without a tenant row yet
  const tenantEmails = new Set((tenants ?? []).map(t => t.email));
  const authOnly = (authUsers?.users ?? [])
    .filter(u => u.email && !tenantEmails.has(u.email!))
    .map(u => ({ id: null as null, name: u.user_metadata?.name as string | undefined ?? null, email: u.email! }));

  const allUsers = [
    ...(tenants ?? []).map(t => ({ id: t.id, name: t.name, email: t.email })),
    ...authOnly,
  ];

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <a href="/admin/projects" className="text-xs text-white/30 hover:text-white/60 transition-colors">
          ← Projects
        </a>
        <h1 className="text-2xl font-bold text-white mt-3">New Project</h1>
        <p className="text-white/40 text-sm mt-1">Pick a client, define their goals, and deploy Nexus agents on their behalf.</p>
      </div>

      {params.error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {decodeURIComponent(params.error)}
        </div>
      )}

      <NewProjectForm users={allUsers} />
    </div>
  );
}
