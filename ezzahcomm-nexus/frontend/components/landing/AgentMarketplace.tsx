const AGENTS = [
  {
    name: 'Billing Agent',
    tag: 'Finance',
    tagColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    description: 'Processes M-Pesa STK pushes, Paystack cards, generates invoices, and reconciles payments automatically.',
    tasks: ['STK Push automation', 'Invoice generation', 'Failed payment retry', 'Receipt delivery'],
    dot: 'bg-emerald-500',
  },
  {
    name: 'Marketing Agent',
    tag: 'Growth',
    tagColor: 'text-blue-700 bg-blue-50 border-blue-200',
    description: 'Runs SMS campaigns, manages email sequences, tracks conversion funnels, and optimizes spend.',
    tasks: ['Bulk SMS campaigns', 'Email automation', 'Conversion tracking', 'Audience segmentation'],
    dot: 'bg-blue-500',
  },
  {
    name: 'Support Agent',
    tag: 'CX',
    tagColor: 'text-violet-700 bg-violet-50 border-violet-200',
    description: 'Answers customer queries instantly, escalates complex issues, and learns from every resolution.',
    tasks: ['24/7 query resolution', 'Ticket escalation', 'Knowledge base search', 'Response templates'],
    dot: 'bg-violet-500',
  },
  {
    name: 'Analytics Agent',
    tag: 'Intelligence',
    tagColor: 'text-amber-700 bg-amber-50 border-amber-200',
    description: 'Generates weekly business reports, tracks KPIs, identifies anomalies, and surfaces insights.',
    tasks: ['KPI dashboards', 'Weekly reports', 'Anomaly detection', 'Revenue forecasting'],
    dot: 'bg-amber-500',
  },
  {
    name: 'Memory Agent',
    tag: 'AI Core',
    tagColor: 'text-pink-700 bg-pink-50 border-pink-200',
    description: 'Maintains persistent context across all agents using semantic vector search and Supabase pgvector.',
    tasks: ['Context persistence', 'Semantic retrieval', 'Knowledge indexing', 'Session continuity'],
    dot: 'bg-pink-500',
  },
  {
    name: 'Deployment Agent',
    tag: 'DevOps',
    tagColor: 'text-teal-700 bg-teal-50 border-teal-200',
    description: 'Monitors system health, triggers deployments, handles rollbacks, and manages infrastructure.',
    tasks: ['Health monitoring', 'Zero-downtime deploy', 'Rollback automation', 'PM2 management'],
    dot: 'bg-teal-500',
  },
];

export default function AgentMarketplace() {
  return (
    <section id="agents" className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <p className="text-xs font-semibold tracking-widest text-blue-600/70 uppercase mb-4">Agent Marketplace</p>
        <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
          13 specialized agents,
          <br />
          <span className="text-slate-400">all working together.</span>
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto">
          Each agent is purpose-built for a specific business function and orchestrated by NEXUS Core.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {AGENTS.map(({ name, tag, tagColor, description, tasks, dot }) => (
          <div
            key={name}
            className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-900">{name}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${tagColor}`}>
                {tag}
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">{description}</p>
            <ul className="space-y-1.5">
              {tasks.map((task) => (
                <li key={task} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                  {task}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
