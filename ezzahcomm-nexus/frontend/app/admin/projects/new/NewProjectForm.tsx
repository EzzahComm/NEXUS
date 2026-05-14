'use client';

import { useState, useRef, useTransition } from 'react';
import { createProject } from '../actions';

type User = { id: string | null; name: string | null; email: string };

const AGENT_TEMPLATES = [
  {
    type: 'customer_support', name: 'Customer Support', icon: '💬',
    capabilities: ['chat', 'sms', 'faq', 'ticket_routing'],
    tasks: [
      { type: 'handle_chat',      title: 'Handle chat & WhatsApp inquiries' },
      { type: 'respond_sms',      title: 'Respond to inbound SMS' },
      { type: 'route_tickets',    title: 'Triage & route support tickets' },
      { type: 'draft_responses',  title: 'Draft response templates' },
    ],
  },
  {
    type: 'sales_outreach', name: 'Sales Outreach', icon: '📈',
    capabilities: ['lead_gen', 'email', 'sms', 'crm_sync'],
    tasks: [
      { type: 'qualify_leads',   title: 'Qualify inbound leads' },
      { type: 'send_follow_ups', title: 'Send personalised follow-ups' },
      { type: 'book_meetings',   title: 'Schedule discovery calls' },
      { type: 'update_crm',      title: 'Update CRM records' },
    ],
  },
  {
    type: 'data_analyst', name: 'Data Analyst', icon: '📊',
    capabilities: ['reporting', 'dashboards', 'anomaly_detection'],
    tasks: [
      { type: 'daily_report',      title: 'Generate daily KPI report' },
      { type: 'anomaly_detection', title: 'Flag anomalies & outliers' },
      { type: 'competitor_watch',  title: 'Monitor competitor pricing' },
      { type: 'forecast',          title: 'Build revenue forecasts' },
    ],
  },
  {
    type: 'content_creator', name: 'Content Creator', icon: '✍️',
    capabilities: ['social_media', 'email', 'copywriting', 'scheduling'],
    tasks: [
      { type: 'social_posts',     title: 'Draft social media posts' },
      { type: 'email_campaigns',  title: 'Write email campaigns' },
      { type: 'ad_copy',          title: 'Generate ad copy variants' },
      { type: 'content_calendar', title: 'Plan content calendar' },
    ],
  },
  {
    type: 'ops_automation', name: 'Ops Automation', icon: '⚙️',
    capabilities: ['workflow', 'approvals', 'notifications', 'integrations'],
    tasks: [
      { type: 'approval_routing', title: 'Route approvals & sign-offs' },
      { type: 'notifications',    title: 'Send automated notifications' },
      { type: 'data_sync',        title: 'Sync data across systems' },
      { type: 'onboarding',       title: 'Automate client onboarding' },
    ],
  },
  {
    type: 'finance_monitor', name: 'Finance Monitor', icon: '💰',
    capabilities: ['payments', 'reconciliation', 'alerts', 'reporting'],
    tasks: [
      { type: 'payment_tracking', title: 'Track payment status' },
      { type: 'reconciliation',   title: 'Reconcile transactions' },
      { type: 'invoice_alerts',   title: 'Alert on overdue invoices' },
      { type: 'monthly_summary',  title: 'Generate monthly financial summary' },
    ],
  },
  {
    type: 'web_development', name: 'Web Development', icon: '🌐',
    capabilities: [],   // resolved per specialization at submit time
    tasks: [],          // resolved per specialization
    specializations: {
      fullstack: {
        label: 'Full-Stack',
        capabilities: ['react', 'next.js', 'node.js', 'postgresql', 'deployment'],
        tasks: [
          { type: 'build_app',      title: 'Build complete web application' },
          { type: 'design_schema',  title: 'Design database schema & API layer' },
          { type: 'implement_auth', title: 'Implement auth & access control' },
          { type: 'deploy_app',     title: 'Deploy & configure hosting' },
        ],
      },
      frontend: {
        label: 'Frontend',
        capabilities: ['react', 'next.js', 'tailwind', 'typescript', 'testing'],
        tasks: [
          { type: 'build_ui',        title: 'Build responsive UI components' },
          { type: 'state_mgmt',      title: 'Implement state management' },
          { type: 'perf_optimise',   title: 'Optimise performance & Core Web Vitals' },
          { type: 'api_integration', title: 'Integrate APIs & handle data fetching' },
        ],
      },
      backend: {
        label: 'Backend',
        capabilities: ['node.js', 'rest_api', 'graphql', 'postgresql', 'redis'],
        tasks: [
          { type: 'build_api',     title: 'Design & build REST/GraphQL API' },
          { type: 'setup_db',      title: 'Set up database, ORM & migrations' },
          { type: 'auth_caching',  title: 'Implement auth, caching & queuing' },
          { type: 'api_docs',      title: 'Write tests & API documentation' },
        ],
      },
      integrations: {
        label: 'Integrations',
        capabilities: ['webhooks', 'api_connectors', 'data_sync', 'payments', 'crm'],
        tasks: [
          { type: 'third_party_apis', title: 'Connect third-party APIs & webhooks' },
          { type: 'data_pipeline',    title: 'Build data sync pipelines' },
          { type: 'payment_gateway',  title: 'Set up payment gateway integration' },
          { type: 'crm_connectors',   title: 'Configure CRM/ERP connectors' },
        ],
      },
    } as const,
  },
] as const;

type Specialization = 'fullstack' | 'frontend' | 'backend' | 'integrations';

type AgentConfig = {
  selectedTasks: Set<string>;
  instructions: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  specialization?: Specialization;
};

export default function NewProjectForm({ users }: { users: User[] }) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearch, setUserSearch]     = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [agentConfig, setAgentConfig]       = useState<Record<string, AgentConfig>>({});

  const [files, setFiles]             = useState<File[]>([]);
  const [dragOver, setDragOver]       = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const [isPending, startTransition]  = useTransition();

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.name ?? '').toLowerCase().includes(userSearch.toLowerCase())
  );

  function toggleAgent(type: string) {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
        if (!agentConfig[type]) {
          setAgentConfig(c => ({
            ...c,
            [type]: { selectedTasks: new Set(), instructions: '', priority: 'medium' },
          }));
        }
      }
      return next;
    });
  }

  function toggleTask(agentType: string, taskType: string) {
    setAgentConfig(prev => {
      const cfg = prev[agentType] ?? { selectedTasks: new Set(), instructions: '', priority: 'medium' as const };
      const tasks = new Set(cfg.selectedTasks);
      tasks.has(taskType) ? tasks.delete(taskType) : tasks.add(taskType);
      return { ...prev, [agentType]: { ...cfg, selectedTasks: tasks } };
    });
  }

  function setInstruction(agentType: string, val: string) {
    setAgentConfig(prev => ({
      ...prev,
      [agentType]: { ...(prev[agentType] ?? { selectedTasks: new Set(), priority: 'medium' as const }), instructions: val },
    }));
  }

  function setSpecialization(agentType: string, spec: Specialization) {
    setAgentConfig(prev => ({
      ...prev,
      [agentType]: { ...(prev[agentType] ?? { instructions: '', priority: 'medium' as const }), specialization: spec, selectedTasks: new Set() },
    }));
  }

  function setPriority(agentType: string, val: 'critical' | 'high' | 'medium' | 'low') {
    setAgentConfig(prev => ({
      ...prev,
      [agentType]: { ...(prev[agentType] ?? { selectedTasks: new Set(), instructions: '' }), priority: val },
    }));
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const merged = [...files, ...Array.from(incoming)].slice(0, 4);
    setFiles(merged);
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function isReady() {
    if (!selectedUser) return false;
    if (selectedAgents.size === 0) return false;
    for (const type of selectedAgents) {
      const cfg = agentConfig[type];
      if (!cfg?.selectedTasks.size) return false;
      if (type === 'web_development' && !cfg.specialization) return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Attach files
    fd.delete('files');
    for (const f of files) fd.append('files', f);

    // Serialize agent config
    const agentPayload = AGENT_TEMPLATES
      .filter(t => selectedAgents.has(t.type))
      .map(t => {
        const cfg  = agentConfig[t.type];
        const spec = (t.type === 'web_development' && cfg?.specialization)
          ? (t as { specializations: Record<string, { label: string; capabilities: readonly string[]; tasks: readonly { type: string; title: string }[] }> }).specializations[cfg.specialization]
          : null;
        const resolvedTasks  = spec ? [...spec.tasks]  : [...t.tasks];
        const resolvedCaps   = spec ? [...spec.capabilities] : [...t.capabilities];
        const resolvedType   = spec ? `web_dev_${cfg!.specialization!}` : t.type;
        const resolvedName   = spec ? `${spec.label} Dev Agent` : `${t.name} Agent`;
        const tasks = resolvedTasks
          .filter(task => cfg?.selectedTasks.has(task.type))
          .map(task => ({ ...task, priority: cfg?.priority ?? 'medium' }));
        return {
          name:         resolvedName,
          type:         resolvedType,
          capabilities: resolvedCaps,
          tasks,
          instructions: cfg?.instructions ?? '',
        };
      });

    fd.set('agents', JSON.stringify(agentPayload));

    startTransition(() => createProject(fd));
  }

  const totalTasks = [...selectedAgents].reduce(
    (s, type) => s + (agentConfig[type]?.selectedTasks.size ?? 0), 0
  );

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data"
      className="grid grid-cols-1 lg:grid-cols-2 gap-8">

      {/* ── LEFT COLUMN ─────────────────────────────── */}
      <div className="flex flex-col gap-5">

        {/* 1. Client */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">1 — Select client</h2>
          <input type="hidden" name="tenant_id"    value={selectedUser?.id ?? ''} />
          <input type="hidden" name="tenant_email" value={selectedUser?.email ?? ''} />
          <input type="hidden" name="tenant_name"  value={selectedUser?.name ?? ''} />

          {selectedUser ? (
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
              <div>
                {selectedUser.name && <p className="text-white text-sm font-medium">{selectedUser.name}</p>}
                <p className="text-white/50 text-xs">{selectedUser.email}</p>
                {!selectedUser.id && <span className="text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded mt-1 inline-block">New tenant will be created</span>}
              </div>
              <button type="button" onClick={() => { setSelectedUser(null); setUserSearch(''); }}
                className="text-white/30 hover:text-white/60 text-xs transition-colors">Change</button>
            </div>
          ) : (
            <div className="relative">
              <input type="text" value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Search by name or email…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-red-500/40 transition-colors"
              />
              {showDropdown && filteredUsers.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-[#0d0d0d] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto">
                  {filteredUsers.slice(0, 15).map(u => (
                    <button key={u.email} type="button"
                      onClick={() => { setSelectedUser(u); setShowDropdown(false); setUserSearch(''); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors">
                      {u.name && <p className="text-white text-sm">{u.name}</p>}
                      <p className="text-white/50 text-xs">{u.email}</p>
                      {!u.id && <span className="text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">new tenant</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Project details */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">2 — Project details</h2>

          <div>
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider" htmlFor="name">Name *</label>
            <input id="name" name="name" type="text" required
              placeholder="e.g. Nairobi Retail AI Suite"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-red-500/40 transition-colors" />
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider" htmlFor="description">Short description</label>
            <input id="description" name="description" type="text"
              placeholder="One-line project overview"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-red-500/40 transition-colors" />
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider" htmlFor="needs">Client needs &amp; goals</label>
            <textarea id="needs" name="needs" rows={3}
              placeholder="Describe the client's pain points, goals, constraints, and success metrics…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-red-500/40 transition-colors resize-none" />
          </div>
        </div>

        {/* 3. Resources */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">3 — Project resources</h2>

          {/* GitHub URL */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider" htmlFor="github_url">GitHub repository</label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-red-500/40 transition-colors">
              <svg className="w-4 h-4 text-white/30 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02 0 2.04.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 22.3 24 17.8 24 12.5 24 5.87 18.63.5 12 .5z"/>
              </svg>
              <input id="github_url" name="github_url" type="url"
                placeholder="https://github.com/org/repo"
                className="flex-1 bg-transparent text-white placeholder-white/20 text-sm focus:outline-none" />
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">
              Upload files <span className="text-white/20 normal-case">(up to 4 · 5 MB each)</span>
            </label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl px-4 py-5 text-center transition-colors ${
                dragOver ? 'border-red-500/40 bg-red-500/5' : 'border-white/10 hover:border-white/20'
              } ${files.length >= 4 ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <p className="text-white/30 text-xs">Drag &amp; drop or click to upload</p>
              <input ref={fileInputRef} type="file" multiple className="hidden" title="Upload project files"
                onChange={e => addFiles(e.target.files)} accept="*/*" />
            </div>

            {files.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1.5">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-3.5 h-3.5 text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-white/70 text-xs truncate">{f.name}</span>
                      <span className="text-white/25 text-xs shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); removeFile(i); }}
                      className="text-white/20 hover:text-red-400 transition-colors ml-2 text-xs">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN ─────────────────────────────── */}
      <div className="flex flex-col gap-5">
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">4 — Agents, tasks &amp; skills</h2>
            {selectedAgents.size > 0 && (
              <span className="text-xs text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded-full">
                {selectedAgents.size} agent{selectedAgents.size > 1 ? 's' : ''} · {totalTasks} task{totalTasks !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {AGENT_TEMPLATES.map(t => {
              const active = selectedAgents.has(t.type);
              const cfg    = agentConfig[t.type];
              const isWebDev = t.type === 'web_development';
              const specs    = isWebDev ? (t as { specializations: Record<string, { label: string; capabilities: readonly string[]; tasks: readonly { type: string; title: string }[] }> }).specializations : null;
              const activeSpec = isWebDev && cfg?.specialization ? specs![cfg.specialization] : null;
              const visibleCaps  = activeSpec ? [...activeSpec.capabilities]  : [...t.capabilities];
              const visibleTasks = activeSpec ? [...activeSpec.tasks] : [...t.tasks];

              return (
                <div key={t.type}
                  className={`rounded-xl border transition-all ${active ? 'border-red-500/30' : 'border-white/8'}`}>

                  {/* Agent row */}
                  <button type="button" onClick={() => toggleAgent(t.type)}
                    className={`w-full text-left px-4 py-3.5 flex items-center gap-3 rounded-xl transition-colors ${
                      active ? 'bg-red-500/5' : 'hover:bg-white/3'
                    }`}>
                    <span className="text-lg shrink-0">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{t.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {isWebDev && !activeSpec
                          ? <span className="text-[10px] text-[#0066ff]/60 bg-[#0066ff]/8 px-1.5 py-0.5 rounded">full-stack · frontend · backend · integrations</span>
                          : visibleCaps.map(c => (
                              <span key={c} className="text-[10px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded">{c}</span>
                            ))
                        }
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      active ? 'border-red-500 bg-red-500' : 'border-white/20'
                    }`}>
                      {active && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>}
                    </div>
                  </button>

                  {/* Expanded config */}
                  {active && (
                    <div className="px-4 pb-4 flex flex-col gap-3 border-t border-red-500/10 pt-3">

                      {/* Web dev specialization picker */}
                      {isWebDev && specs && (
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Specialization *</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(Object.entries(specs) as [Specialization, { label: string }][]).map(([key, s]) => {
                              const sel = cfg?.specialization === key;
                              return (
                                <button key={key} type="button"
                                  onClick={() => setSpecialization(t.type, key)}
                                  className={`py-2 px-3 rounded-lg text-xs font-medium text-left flex items-center gap-2 transition-colors ${
                                    sel ? 'bg-[#0066ff]/15 border border-[#0066ff]/30 text-[#4d94ff]' : 'bg-white/5 border border-white/8 text-white/40 hover:text-white/70 hover:bg-white/8'
                                  }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sel ? 'bg-[#4d94ff]' : 'bg-white/20'}`} />
                                  {s.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tasks — shown for non-webdev always; for webdev only after spec chosen */}
                      {(!isWebDev || activeSpec) && (
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Select tasks</p>
                        <div className="flex flex-col gap-1.5">
                          {visibleTasks.map(task => {
                            const checked = cfg?.selectedTasks.has(task.type) ?? false;
                            return (
                              <label key={task.type}
                                className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg transition-colors ${
                                  checked ? 'bg-[#00ff88]/5 border border-[#00ff88]/15' : 'border border-white/5 hover:bg-white/3'
                                }`}>
                                <input type="checkbox" checked={checked}
                                  onChange={() => toggleTask(t.type, task.type)}
                                  className="sr-only" title={task.title} />
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                  checked ? 'border-[#00ff88] bg-[#00ff88]' : 'border-white/20'
                                }`}>
                                  {checked && <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>}
                                </div>
                                <span className={`text-xs ${checked ? 'text-white' : 'text-white/50'}`}>{task.title}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      )}

                      {/* Priority */}
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Task priority</p>
                        <div className="flex gap-1.5">
                          {(['critical','high','medium','low'] as const).map(p => (
                            <button key={p} type="button"
                              onClick={() => setPriority(t.type, p)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                                (cfg?.priority ?? 'medium') === p
                                  ? p === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : p === 'high'   ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                    : p === 'medium' ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30'
                                    :                  'bg-white/8 text-white/50 border border-white/15'
                                  : 'bg-white/5 text-white/25 border border-white/5 hover:bg-white/8'
                              }`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Instructions */}
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Instructions for this agent</p>
                        <textarea rows={2}
                          value={cfg?.instructions ?? ''}
                          onChange={e => setInstruction(t.type, e.target.value)}
                          placeholder={`Specific guidance for the ${t.name} agent on this project…`}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/80 placeholder-white/15 text-xs focus:outline-none focus:border-red-500/30 resize-none transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={isPending || !isReady()}
          className="w-full py-3.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm">
          {isPending
            ? 'Deploying project…'
            : isReady()
              ? `Deploy ${selectedAgents.size} agent${selectedAgents.size > 1 ? 's' : ''} · ${totalTasks} task${totalTasks !== 1 ? 's' : ''}`
              : 'Complete setup above to deploy'}
        </button>

        <p className="text-center text-[10px] text-white/15">
          {!selectedUser ? '① Pick a client' :
           selectedAgents.size === 0 ? '④ Select at least one agent' :
           totalTasks === 0 ? 'Select at least one task per agent' : ''}
        </p>
      </div>
    </form>
  );
}
