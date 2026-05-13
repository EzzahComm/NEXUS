import Link from 'next/link';

export default function FinalCTA() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="relative border border-white/10 rounded-3xl overflow-hidden p-12 text-center bg-gradient-to-b from-[#00ff88]/5 to-[#0066ff]/5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#00ff88]/5 blur-3xl rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/50 mb-6 bg-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] status-dot" />
            NEXUS runtime is live — deploy in minutes
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Your business is ready
            <br />
            <span className="gradient-text">for autonomous AI.</span>
          </h2>
          <p className="text-white/40 max-w-xl mx-auto mb-10 text-lg">
            Start your 14-day free trial. No credit card. No dev team required.
            Your first agent can be live in under an hour.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto bg-[#00ff88] text-black font-semibold px-10 py-4 rounded-xl hover:bg-[#00e87a] transition-all hover:scale-105 text-base glow-green"
            >
              Start Free Trial →
            </Link>
            <Link
              href="mailto:sales@ezzahcomm.co.ke"
              className="w-full sm:w-auto border border-white/15 text-white/70 px-10 py-4 rounded-xl hover:border-white/30 hover:text-white transition-all text-base font-medium"
            >
              Talk to Sales
            </Link>
          </div>

          <p className="text-white/20 text-xs mt-6">
            Trusted by businesses across Kenya, Nigeria, and East Africa
          </p>
        </div>
      </div>
    </section>
  );
}
