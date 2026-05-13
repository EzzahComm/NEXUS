import Link from 'next/link';

const PLANS = [
  {
    name: 'Starter',
    price: 'KES 2,999',
    period: '/month',
    description: 'For solo founders and small teams getting started with AI automation.',
    features: [
      '3 active agents',
      '1,000 task executions/mo',
      '500 SMS credits',
      'M-Pesa integration',
      'Email support',
      '99.9% uptime SLA',
    ],
    cta: 'Start Free Trial',
    href: '/auth/signup?plan=starter',
    featured: false,
  },
  {
    name: 'Growth',
    price: 'KES 9,999',
    period: '/month',
    description: 'For growing businesses that need full automation across all departments.',
    features: [
      '10 active agents',
      '10,000 task executions/mo',
      '5,000 SMS credits',
      'M-Pesa + Paystack',
      'WhatsApp Business',
      'Priority support',
      'Analytics dashboard',
      'Custom workflows',
    ],
    cta: 'Start Free Trial',
    href: '/auth/signup?plan=growth',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For enterprise deployments with custom agent development and dedicated support.',
    features: [
      'Unlimited agents',
      'Unlimited executions',
      'Unlimited SMS',
      'All payment providers',
      'Custom agent training',
      'Dedicated VPS',
      'SLA guarantees',
      'Onboarding engineer',
    ],
    cta: 'Contact Us',
    href: 'mailto:sales@ezzahcomm.co.ke',
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <p className="text-xs font-semibold tracking-widest text-[#00ff88]/60 uppercase mb-4">Pricing</p>
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Transparent pricing.
          <span className="text-white/40"> No surprises.</span>
        </h2>
        <p className="text-white/40">14-day free trial on all plans. No credit card required.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map(({ name, price, period, description, features, cta, href, featured }) => (
          <div
            key={name}
            className={`relative rounded-2xl p-8 flex flex-col ${
              featured
                ? 'bg-gradient-to-b from-[#00ff88]/8 to-[#0066ff]/8 border border-[#00ff88]/30'
                : 'border border-white/8 bg-white/2'
            }`}
          >
            {featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#00ff88] text-black text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
              </div>
            )}

            <div className="mb-6">
              <p className="text-sm text-white/40 mb-1">{name}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{price}</span>
                <span className="text-white/30 text-sm">{period}</span>
              </div>
              <p className="text-sm text-white/40 mt-2 leading-relaxed">{description}</p>
            </div>

            <ul className="space-y-2.5 mb-8 flex-1">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                  <span className="text-[#00ff88] text-xs">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={href}
              className={`text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                featured
                  ? 'bg-[#00ff88] text-black hover:bg-[#00e87a]'
                  : 'border border-white/15 text-white hover:border-white/30'
              }`}
            >
              {cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
