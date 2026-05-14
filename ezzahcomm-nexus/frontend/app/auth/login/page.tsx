import Link from 'next/link';
import { login } from '../actions';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#0066ff] flex items-center justify-center text-black font-bold">
            N
          </span>
          <span className="font-semibold text-white text-lg tracking-tight">NEXUS</span>
          <span className="text-xs text-white/30">by EZZAHCOMM</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-white/50 text-sm mb-8">Sign in to your NEXUS account.</p>

          <ErrorMessage searchParams={searchParams} />

          <form action={login} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-white/8 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#00ff88]/50 focus:bg-white/10 transition-colors"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-white/8 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#00ff88]/50 focus:bg-white/10 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full bg-[#00ff88] text-black font-semibold py-2.5 rounded-lg hover:bg-[#00e87a] transition-colors text-sm"
            >
              Sign in
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-[#00ff88] hover:text-[#00e87a] transition-colors">
              Start free trial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

async function ErrorMessage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  if (!params.error) return null;
  return (
    <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
      {decodeURIComponent(params.error)}
    </div>
  );
}
