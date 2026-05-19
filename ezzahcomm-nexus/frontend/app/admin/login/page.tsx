import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'ezzahcomm@gmail.com';

async function adminLogin(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const email    = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (email !== ADMIN_EMAIL) {
    redirect('/admin/login?error=Access+denied');
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);

  redirect('/admin');
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in as admin → go straight through
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if ((data?.claims?.email as string) === ADMIN_EMAIL) redirect('/admin');

  const params = await searchParams;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-semibold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Super Admin
          </span>
        </div>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-1">Admin access</h1>
          <p className="text-white/30 text-sm mb-7">Restricted to authorised personnel only.</p>

          {params.error && (
            <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {decodeURIComponent(params.error)}
            </div>
          )}

          <form action={adminLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-red-500/40 transition-colors"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-red-500/40 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full bg-red-500 text-white font-semibold py-2.5 rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              Sign in to Admin
            </button>
          </form>
        </div>

        <p className="text-center text-white/15 text-xs mt-6">
          Not an admin?{' '}
          <a href="/auth/login" className="hover:text-white/40 transition-colors">
            Go to client login
          </a>
        </p>
      </div>
    </div>
  );
}
