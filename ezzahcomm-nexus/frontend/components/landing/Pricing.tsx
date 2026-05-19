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
        <p className="text-xs font-semibold tracking-widest text-blue-600/70 uppercase mb-4">Pricing</p>
        <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
          Transparent pricing.
          <span className="text-slate-400"> No surprises.</span>
        </h2>
        <p className="text-slate-500">14-day free trial on all plans. No credit card required.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map(({ name, price, period, description, features, cta, href, featured }) => (
          <div
            key={name}
            className={`relative rounded-2xl p-8 flex flex-col ${
              featured
                ? 'bg-blue-600 border border-blue-500 shadow-xl shadow-blue-600/20'
                : 'border border-slate-200 bg-white shadow-sm'
            }`}
          >
            {featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-white text-blue-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-blue-100">Most Popular</span>
              </div>
            )}

            <div className="mb-6">
              <p className={`text-sm mb-1 ${featured ? 'text-blue-200' : 'text-slate-500'}`}>{name}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-bold ${featured ? 'text-white' : 'text-slate-900'}`}>{price}</span>
                <span className={`text-sm ${featured ? 'text-blue-200' : 'text-slate-400'}`}>{period}</span>
              </div>
              <p className={`text-sm mt-2 leading-relaxed ${featured ? 'text-blue-100' : 'text-slate-500'}`}>{description}</p>
            </div>

            <ul className="space-y-2.5 mb-8 flex-1">
              {features.map((f) => (
                <li key={f} className={`flex items-center gap-2.5 text-sm ${featured ? 'text-blue-100' : 'text-slate-600'}`}>
                  <svg className={`w-4 h-4 flex-shrink-0 ${featured ? 'text-blue-200' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={href}
              className={`text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                featured
                  ? 'bg-white text-blue-700 hover:bg-blue-50'
                  : 'border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50'
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
