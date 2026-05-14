import { createAdminClient } from '@/lib/supabase/admin-client';

export default async function AdminUsersPage() {
  const db = createAdminClient();
  const { data } = await db.auth.admin.listUsers({ perPage: 200 });
  const users = data?.users ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-white/40 text-sm mt-1">{users.length} registered accounts.</p>
      </div>

      {!users.length ? (
        <p className="text-white/30 text-sm">No users yet.</p>
      ) : (
        <div className="border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Confirmed</th>
                <th className="text-left px-5 py-3 font-medium">Provider</th>
                <th className="text-left px-5 py-3 font-medium">Last Sign In</th>
                <th className="text-left px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-b border-white/5 hover:bg-white/3 ${i === users.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-5 py-3.5 text-white font-medium">{u.email}</td>
                  <td className="px-5 py-3.5">
                    {u.email_confirmed_at
                      ? <span className="text-[#00ff88] text-xs">Confirmed</span>
                      : <span className="text-[#f59e0b] text-xs">Pending</span>}
                  </td>
                  <td className="px-5 py-3.5 text-white/40 text-xs">{u.app_metadata?.provider ?? 'email'}</td>
                  <td className="px-5 py-3.5 text-white/30 text-xs">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-white/30 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
