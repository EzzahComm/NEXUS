import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#0066ff] flex items-center justify-center text-black font-bold">
            N
          </span>
          <span className="font-semibold text-white text-lg tracking-tight">NEXUS</span>
          <span className="text-xs text-white/30">by EZZAHCOMM</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="w-14 h-14 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-[#00ff88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            We sent a confirmation link to your email address. Click it to activate your account and sign in.
          </p>

          <p className="text-white/30 text-xs">
            Didn&apos;t receive it? Check your spam folder, or{' '}
            <Link href="/auth/signup" className="text-[#00ff88] hover:text-[#00e87a] transition-colors">
              sign up again
            </Link>{' '}
            with a valid email.
          </p>
        </div>

        <Link href="/auth/login" className="inline-block mt-6 text-sm text-white/40 hover:text-white/70 transition-colors">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
