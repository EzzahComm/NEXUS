const STATS = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<2s', label: 'Agent response time' },
  { value: '13+', label: 'Specialized agents' },
  { value: 'M-Pesa', label: 'Native payments' },
];

export default function Stats() {
  return (
    <section className="border-y border-white/8 bg-white/2">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="text-3xl font-bold gradient-text mb-1">{value}</p>
            <p className="text-sm text-white/40">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
