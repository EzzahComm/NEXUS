import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[600px] rounded-full bg-blue-600/10 blur-3xl" />
      </div>
      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none grid-bg-dark" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Status badge */}
        <div className="inline-flex items-center gap-2 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/50 mb-8 bg-white/5 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-dot" />
          Runtime active · 13 agents deployed
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-none mb-6 text-white">
          Your business,{' '}
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">run by AI.</span>
          <br />
          <span className="text-white/70">24 hours a day.</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          NEXUS is the autonomous AI operating system for African enterprises.
          Deploy specialized agents that handle billing, marketing, support,
          and operations — while you focus on growth.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/auth/signup"
            className="w-full sm:w-auto bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-500 transition-all hover:scale-105 text-base shadow-lg shadow-blue-600/25"
          >
            Deploy Your First Agent →
          </Link>
          <Link
            href="#how-it-works"
            className="w-full sm:w-auto border border-white/15 text-white/70 font-medium px-8 py-3.5 rounded-xl hover:border-white/30 hover:text-white transition-all text-base"
          >
            See How It Works
          </Link>
        </div>

        {/* Live terminal preview */}
        <div className="max-w-2xl mx-auto border border-white/10 rounded-2xl overflow-hidden bg-slate-950 text-left shadow-2xl shadow-black/40">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/8 bg-white/3">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-3 text-xs text-white/30 font-mono">nexus · orchestrator</span>
          </div>
          <div className="p-6 font-mono text-sm space-y-1.5">
            <p><span className="text-emerald-400">✓</span> <span className="text-slate-400">billing-agent</span> <span className="text-slate-300">processed 4 M-Pesa payments</span></p>
            <p><span className="text-emerald-400">✓</span> <span className="text-slate-400">marketing-agent</span> <span className="text-slate-300">sent 1,240 SMS campaigns</span></p>
            <p><span className="text-emerald-400">✓</span> <span className="text-slate-400">support-agent</span> <span className="text-slate-300">resolved 17 tickets (avg 43s)</span></p>
            <p><span className="text-blue-400">→</span> <span className="text-slate-400">analytics-agent</span> <span className="text-slate-300">generating weekly report...</span></p>
            <p className="text-slate-600">_</p>
          </div>
        </div>
      </div>
    </section>
  );
}
