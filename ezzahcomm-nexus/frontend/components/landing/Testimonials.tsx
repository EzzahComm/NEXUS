const TESTIMONIALS = [
  {
    quote: "NEXUS replaced three junior staff members overnight. The billing agent processes every M-Pesa payment without a single manual step.",
    name: "James Mwangi",
    role: "CEO, Savanna Logistics",
    initials: "JM",
    color: "#00ff88",
  },
  {
    quote: "We went from sending 200 SMS campaigns manually per week to 5,000 automated — with better conversion rates and zero extra headcount.",
    name: "Aisha Okonkwo",
    role: "Marketing Director, Nairobi Retail Group",
    initials: "AO",
    color: "#0066ff",
  },
  {
    quote: "The support agent handles 80% of our customer queries instantly. Our team now focuses only on complex cases. Response time dropped from 4 hours to 40 seconds.",
    name: "Samuel Kariuki",
    role: "CTO, PayFlex Kenya",
    initials: "SK",
    color: "#8b5cf6",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-[#030303] border-y border-white/8 py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest text-[#00ff88]/60 uppercase mb-4">Results</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Businesses running on NEXUS
            <span className="text-white/40"> don't go back.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ quote, name, role, initials, color }) => (
            <div key={name} className="border border-white/8 rounded-2xl p-8 bg-white/2">
              <p className="text-white/60 text-sm leading-relaxed mb-6">"{quote}"</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {initials}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{name}</p>
                  <p className="text-white/30 text-xs">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
