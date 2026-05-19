import Link from 'next/link';

export default function FinalCTA() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="relative rounded-3xl overflow-hidden p-12 text-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 shadow-2xl shadow-blue-600/20">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 pointer-events-none grid-bg-dark opacity-30" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-1.5 text-xs text-white/70 mb-6 bg-white/10 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-dot" />
            NEXUS runtime is live — deploy in minutes
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Your business is ready
            <br />
            <span className="text-blue-200">for autonomous AI.</span>
          </h2>
          <p className="text-blue-100 max-w-xl mx-auto mb-10 text-lg">
            Start your 14-day free trial. No credit card. No dev team required.
            Your first agent can be live in under an hour.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto bg-white text-blue-700 font-semibold px-10 py-4 rounded-xl hover:bg-blue-50 transition-all hover:scale-105 text-base shadow-lg"
            >
              Start Free Trial →
            </Link>
            <Link
              href="mailto:sales@ezzahcomm.co.ke"
              className="w-full sm:w-auto border border-white/25 text-white/80 px-10 py-4 rounded-xl hover:border-white/50 hover:text-white transition-all text-base font-medium"
            >
              Talk to Sales
            </Link>
          </div>

          <p className="text-white/30 text-xs mt-6">
            Trusted by businesses across Kenya, Nigeria, and East Africa
          </p>
        </div>
      </div>
    </section>
  );
}
