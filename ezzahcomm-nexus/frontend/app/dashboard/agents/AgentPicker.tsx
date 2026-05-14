'use client';

import { useState, useTransition } from 'react';
import { createAgent } from './actions';

const TEMPLATES = [
  {
    type: 'support',
    name: 'Customer Support',
    description: 'Responds to customer queries via SMS and WhatsApp around the clock.',
    capabilities: ['sms', 'whatsapp', 'knowledge_base'],
    color: '#00ff88',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    type: 'payments',
    name: 'M-Pesa Monitor',
    description: 'Tracks incoming M-Pesa payments, reconciles transactions, and sends confirmations.',
    capabilities: ['mpesa', 'sms', 'reconciliation'],
    color: '#00cc6a',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    type: 'marketing',
    name: 'SMS Campaigns',
    description: 'Sends scheduled bulk SMS campaigns to your contact list with delivery tracking.',
    capabilities: ['sms', 'scheduling', 'contacts', 'analytics'],
    color: '#0066ff',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  {
    type: 'billing',
    name: 'Invoice Agent',
    description: 'Generates, sends, and follows up on invoices. Notifies clients on payment via M-Pesa.',
    capabilities: ['invoicing', 'email', 'mpesa', 'reminders'],
    color: '#a855f7',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    type: 'social',
    name: 'Social Media',
    description: 'Schedules and publishes content across Twitter, Facebook, LinkedIn, and TikTok.',
    capabilities: ['twitter', 'facebook', 'linkedin', 'tiktok', 'scheduling'],
    color: '#f59e0b',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
  },
  {
    type: 'custom',
    name: 'Custom Agent',
    description: 'Define your own agent with custom instructions tailored to your specific workflow.',
    capabilities: [],
    color: '#6b7280',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function AgentPicker() {
  const [selected, setSelected] = useState<typeof TEMPLATES[0] | null>(null);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function pick(t: typeof TEMPLATES[0]) {
    setSelected(t);
    setName(t.type === 'custom' ? '' : t.name);
    setError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter a name for your agent.'); return; }
    setError('');
    const fd = new FormData();
    fd.set('name', name.trim());
    fd.set('type', selected!.type);
    const caps = selected!.type === 'custom'
      ? instructions.trim() ? ['custom_instructions'] : []
      : selected!.capabilities;
    fd.set('capabilities', JSON.stringify(caps));
    startTransition(() => createAgent(fd));
  }

  if (selected) {
    return (
      <div className="max-w-lg">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <span style={{ color: selected.color }}>{selected.icon}</span>
          <h2 className="text-lg font-semibold text-white">{selected.name}</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Agent name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={selected.type === 'custom' ? 'e.g. Lead Qualifier Bot' : selected.name}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {selected.type !== 'custom' && selected.capabilities.length > 0 && (
            <div>
              <p className="text-sm text-white/60 mb-2">Capabilities</p>
              <div className="flex flex-wrap gap-2">
                {selected.capabilities.map(c => (
                  <span key={c} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/50">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selected.type === 'custom' && (
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Custom instructions</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={5}
                placeholder="Describe what this agent should do. For example: Monitor incoming emails, categorise support tickets by urgency, and reply with an acknowledgement within 2 minutes..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-[#00ff88] text-black font-semibold py-2.5 rounded-lg hover:bg-[#00e87a] disabled:opacity-50 transition-colors text-sm"
          >
            {pending ? 'Creating…' : 'Deploy agent'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-white font-semibold">Choose an agent template</h2>
        <p className="text-white/40 text-sm mt-1">Pick a pre-built agent or define your own from scratch.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map(t => (
          <button
            key={t.type}
            onClick={() => pick(t)}
            className="text-left bg-white/5 border border-white/8 rounded-xl p-5 hover:border-white/20 hover:bg-white/8 transition-all group"
          >
            <span style={{ color: t.color }} className="mb-3 block">{t.icon}</span>
            <p className="text-white font-medium text-sm mb-1">{t.name}</p>
            <p className="text-white/40 text-xs leading-relaxed">{t.description}</p>
            {t.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {t.capabilities.slice(0, 3).map(c => (
                  <span key={c} className="px-2 py-0.5 bg-white/5 rounded-full text-white/30 text-xs">{c}</span>
                ))}
                {t.capabilities.length > 3 && (
                  <span className="px-2 py-0.5 text-white/20 text-xs">+{t.capabilities.length - 3}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
