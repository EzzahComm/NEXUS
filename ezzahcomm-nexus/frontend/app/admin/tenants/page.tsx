import { createAdminClient } from '@/lib/supabase/admin-client';

const planColor: Record<string, string> = {
  free:       'text-white/40',
  starter:    'text-[#0066ff]',
  pro:        'text-[#a855f7]',
  enterprise: 'text-[#00ff88]',
};

const statusBadge: Record<string, string> = {
  active:    'bg-[#00ff88]/10 text-[#00ff88]',
  suspended: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  cancelled: 'bg-red-500/10 text-red-400',
};

export default async function AdminTenantsPage() {
  const db = createAdminClient();
  const { data: tenants } = await db
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Tenants</h1>
        <p className="text-white/40 text-sm mt-1">{tenants?.length ?? 0} organisations on the platform.</p>
      </div>

      {!tenants?.length ? (
        <p className="text-white/30 text-sm">No tenants yet.</p>
      ) : (
        <div className="border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Plan</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t, i) => (
                <tr key={t.id} className={`border-b border-white/5 hover:bg-white/3 ${i === tenants.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-5 py-3.5 text-white font-medium">{t.name}</td>
                  <td className="px-5 py-3.5 text-white/50">{t.email}</td>
                  <td className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider ${planColor[t.plan] ?? 'text-white/50'}`}>{t.plan}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge[t.status] ?? 'bg-white/8 text-white/50'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />{t.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-white/30 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
