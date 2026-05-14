import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/auth/actions';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string ?? '';
  const userId = data?.claims?.sub as string ?? '';

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage your account and platform preferences.</p>
      </div>

      {/* Account */}
      <section className="bg-white/5 border border-white/8 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Account</h2>
        <div className="flex flex-col gap-4">
          <Field label="Email" value={email} />
          <Field label="User ID" value={userId} mono />
        </div>
      </section>

      {/* Plan */}
      <section className="bg-white/5 border border-white/8 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Starter</p>
            <p className="text-white/40 text-sm mt-0.5">Free tier — upgrade to unlock more agents and workflows.</p>
          </div>
          <span className="px-3 py-1 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-full text-[#00ff88] text-xs font-semibold">
            Active
          </span>
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-red-500/5 border border-red-500/10 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-red-400/70 uppercase tracking-wider mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Sign out</p>
            <p className="text-white/40 text-xs mt-0.5">You will be redirected to the login page.</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg hover:bg-red-500/20 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-white/40 text-xs mb-1">{label}</p>
      <p className={`text-white text-sm ${mono ? 'font-mono text-xs text-white/60' : ''}`}>{value || '—'}</p>
    </div>
  );
}
