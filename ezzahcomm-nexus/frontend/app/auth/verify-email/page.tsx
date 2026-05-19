import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
            N
          </span>
          <span className="font-semibold text-slate-900 text-lg tracking-tight">NEXUS</span>
          <span className="text-xs text-slate-400">by EZZAHCOMM</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            We sent a confirmation link to your email address. Click it to activate your account and sign in.
          </p>

          <p className="text-slate-400 text-xs">
            Didn&apos;t receive it? Check your spam folder, or{' '}
            <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
              sign up again
            </Link>{' '}
            with a valid email.
          </p>
        </div>

        <Link href="/auth/login" className="inline-block mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
