const STEPS = [
  {
    step: '01',
    title: 'Connect your business',
    body: 'Integrate M-Pesa, your SMS provider, email, and CRM in minutes. NEXUS handles all authentication and credential management securely.',
  },
  {
    step: '02',
    title: 'Deploy your agents',
    body: 'Choose from the marketplace or configure custom agents. Each agent is trained on your business context and begins executing immediately.',
  },
  {
    step: '03',
    title: 'NEXUS orchestrates',
    body: 'The Orchestrator routes tasks, manages priorities, handles failures, and coordinates agents — autonomously, 24/7 — with full audit logs.',
  },
  {
    step: '04',
    title: 'You review & scale',
    body: 'Your dashboard shows exactly what\'s running, what\'s been completed, and how performance is trending. Scale agents or add new ones anytime.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#030303] border-y border-white/8 py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest text-[#00ff88]/60 uppercase mb-4">How It Works</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Up and running
            <span className="text-white/40"> in under an hour.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map(({ step, title, body }, i) => (
            <div key={step} className="relative">
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-white/10 to-transparent z-0" />
              )}
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl border border-white/10 bg-white/4 flex items-center justify-center mb-5">
                  <span className="text-xs font-mono text-[#00ff88]">{step}</span>
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
