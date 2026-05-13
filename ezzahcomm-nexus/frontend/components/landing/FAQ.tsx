'use client';

import { useState } from 'react';

const FAQS = [
  {
    q: 'What makes NEXUS different from other automation tools?',
    a: 'NEXUS is built natively for African markets — M-Pesa, Kenya SMS providers, East African business workflows. Most tools are US/EU-centric with poor integrations for our region. NEXUS is also fully autonomous: agents don\'t just execute tasks, they coordinate with each other and adapt over time.',
  },
  {
    q: 'Do I need a developer to set up NEXUS?',
    a: 'No. Most integrations (M-Pesa, SMS, email) connect via API keys and our guided setup wizard. If you want custom agent behaviour or bespoke workflows, our team can assist — or use our API directly if you have a developer.',
  },
  {
    q: 'How does billing work with M-Pesa?',
    a: 'We use the Safaricom Daraja API for STK Push and C2B payments. When a payment is triggered, NEXUS initiates the push, waits for the callback, updates your transaction records automatically, and can trigger any downstream workflow (receipts, access grants, CRM updates).',
  },
  {
    q: 'Is my data isolated from other businesses on the platform?',
    a: 'Yes. NEXUS uses multi-tenant architecture with Row Level Security enforced at the database level via Supabase. Your data, agents, tasks, and memory are scoped strictly to your tenant and are never accessible by other accounts.',
  },
  {
    q: 'What happens if an agent fails?',
    a: 'Every task goes through a BullMQ queue with automatic retry logic. Failed tasks are logged, the orchestrator is notified, and depending on severity, alerts are triggered. Critical tasks are retried up to 5 times with exponential backoff before escalating.',
  },
  {
    q: 'Can I run NEXUS on my own VPS?',
    a: 'Yes. NEXUS ships with a Docker Compose setup, NGINX config, and PM2 ecosystem file for self-hosted deployments. Our docs cover the full VPS setup process. We also offer managed hosting if you prefer zero infrastructure management.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <p className="text-xs font-semibold tracking-widest text-[#00ff88]/60 uppercase mb-4">FAQ</p>
        <h2 className="text-4xl font-bold text-white">Common questions.</h2>
      </div>

      <div className="space-y-2">
        {FAQS.map(({ q, a }, i) => (
          <div key={q} className="border border-white/8 rounded-xl overflow-hidden bg-white/2">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
            >
              <span className="text-sm font-medium text-white/80">{q}</span>
              <span className={`text-white/30 flex-shrink-0 transition-transform ${open === i ? 'rotate-45' : ''}`}>+</span>
            </button>
            {open === i && (
              <div className="px-6 pb-5">
                <p className="text-sm text-white/40 leading-relaxed">{a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
