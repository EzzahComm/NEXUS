const PAINS = [
  {
    icon: '⏱',
    title: 'You\'re doing everything manually',
    body: 'Billing, follow-ups, reports, campaigns — every task requires you. Growth stalls because you\'re the bottleneck.',
  },
  {
    icon: '💸',
    title: 'Hiring staff is expensive',
    body: 'A team to cover operations 24/7 costs more than most SMEs earn. Enterprise automation was never built for you.',
  },
  {
    icon: '🔌',
    title: 'Tools don\'t talk to each other',
    body: 'Your SMS provider, payment gateway, CRM, and email platform are all disconnected silos with no shared intelligence.',
  },
];

export default function Problem() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <p className="text-xs font-semibold tracking-widest text-[#00ff88]/60 uppercase mb-4">The Problem</p>
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Running a business in Africa<br />
          <span className="text-white/40">is relentlessly manual.</span>
        </h2>
        <p className="text-white/40 max-w-xl mx-auto">
          Most automation tools were built for US and European markets. African businesses are left behind.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {PAINS.map(({ icon, title, body }) => (
          <div key={title} className="border border-white/8 rounded-2xl p-8 bg-white/2 hover:border-white/15 transition-colors">
            <div className="text-3xl mb-4">{icon}</div>
            <h3 className="text-white font-semibold text-lg mb-3">{title}</h3>
            <p className="text-white/40 text-sm leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
