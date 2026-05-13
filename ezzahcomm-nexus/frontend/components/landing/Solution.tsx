const CAPABILITIES = [
  { label: 'M-Pesa & Paystack payments', icon: '💳' },
  { label: 'Bulk SMS via textsms.co.ke', icon: '📱' },
  { label: 'WhatsApp Business automation', icon: '💬' },
  { label: 'Multi-tenant SaaS architecture', icon: '🏢' },
  { label: 'Autonomous agent orchestration', icon: '🤖' },
  { label: 'AI memory across sessions', icon: '🧠' },
  { label: 'Real-time analytics & reporting', icon: '📊' },
  { label: 'Deployment & DevOps automation', icon: '🚀' },
];

export default function Solution() {
  return (
    <section className="bg-[#030303] border-y border-white/8 py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#00ff88]/60 uppercase mb-4">The Solution</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              An AI OS built for{' '}
              <span className="gradient-text">African business.</span>
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-8">
              NEXUS is not a chatbot or a no-code tool. It is a fully autonomous operating
              system that runs specialized AI agents — each trained on your business context —
              and coordinates them to execute real work around the clock.
            </p>
            <p className="text-white/50 text-lg leading-relaxed">
              Built natively for M-Pesa, Kenya SMS providers, and East African enterprise workflows.
              No workarounds. No adapters. Just intelligence that understands your market.
            </p>
          </div>

          {/* Right: capability grid */}
          <div className="grid grid-cols-2 gap-3">
            {CAPABILITIES.map(({ label, icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 border border-white/8 rounded-xl px-4 py-3.5 bg-white/2 hover:border-[#00ff88]/20 hover:bg-[#00ff88]/3 transition-all"
              >
                <span className="text-lg">{icon}</span>
                <span className="text-sm text-white/70">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
