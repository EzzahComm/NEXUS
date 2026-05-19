const TESTIMONIALS = [
  {
    quote: "NEXUS replaced three junior staff members overnight. The billing agent processes every M-Pesa payment without a single manual step.",
    name: "James Mwangi",
    role: "CEO, Savanna Logistics",
    initials: "JM",
    avatarBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    quote: "We went from sending 200 SMS campaigns manually per week to 5,000 automated — with better conversion rates and zero extra headcount.",
    name: "Aisha Okonkwo",
    role: "Marketing Director, Nairobi Retail Group",
    initials: "AO",
    avatarBg: 'bg-blue-100 text-blue-700',
  },
  {
    quote: "The support agent handles 80% of our customer queries instantly. Our team now focuses only on complex cases. Response time dropped from 4 hours to 40 seconds.",
    name: "Samuel Kariuki",
    role: "CTO, PayFlex Kenya",
    initials: "SK",
    avatarBg: 'bg-violet-100 text-violet-700',
  },
];

export default function Testimonials() {
  return (
    <section className="bg-slate-50 border-y border-slate-200 py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest text-blue-600/70 uppercase mb-4">Results</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Businesses running on NEXUS
            <span className="text-slate-400"> don&apos;t go back.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ quote, name, role, initials, avatarBg }) => (
            <div key={name} className="border border-slate-200 rounded-2xl p-8 bg-white shadow-sm">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">&ldquo;{quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarBg}`}>
                  {initials}
                </div>
                <div>
                  <p className="text-slate-900 text-sm font-medium">{name}</p>
                  <p className="text-slate-400 text-xs">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
