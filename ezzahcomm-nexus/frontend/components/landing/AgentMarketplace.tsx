const AGENTS = [
  {
    name: 'Billing Agent',
    tag: 'Finance',
    color: '#00ff88',
    description: 'Processes M-Pesa STK pushes, Paystack cards, generates invoices, and reconciles payments automatically.',
    tasks: ['STK Push automation', 'Invoice generation', 'Failed payment retry', 'Receipt delivery'],
  },
  {
    name: 'Marketing Agent',
    tag: 'Growth',
    color: '#0066ff',
    description: 'Runs SMS campaigns, manages email sequences, tracks conversion funnels, and optimizes spend.',
    tasks: ['Bulk SMS campaigns', 'Email automation', 'Conversion tracking', 'Audience segmentation'],
  },
  {
    name: 'Support Agent',
    tag: 'CX',
    color: '#8b5cf6',
    description: 'Answers customer queries instantly, escalates complex issues, and learns from every resolution.',
    tasks: ['24/7 query resolution', 'Ticket escalation', 'Knowledge base search', 'Response templates'],
  },
  {
    name: 'Analytics Agent',
    tag: 'Intelligence',
    color: '#f59e0b',
    description: 'Generates weekly business reports, tracks KPIs, identifies anomalies, and surfaces insights.',
    tasks: ['KPI dashboards', 'Weekly reports', 'Anomaly detection', 'Revenue forecasting'],
  },
  {
    name: 'Memory Agent',
    tag: 'AI Core',
    color: '#ec4899',
    description: 'Maintains persistent context across all agents using semantic vector search and Supabase pgvector.',
    tasks: ['Context persistence', 'Semantic retrieval', 'Knowledge indexing', 'Session continuity'],
  },
  {
    name: 'Deployment Agent',
    tag: 'DevOps',
    color: '#14b8a6',
    description: 'Monitors system health, triggers deployments, handles rollbacks, and manages infrastructure.',
    tasks: ['Health monitoring', 'Zero-downtime deploy', 'Rollback automation', 'PM2 management'],
  },
];

export default function AgentMarketplace() {
  return (
    <section id="agents" className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <p className="text-xs font-semibold tracking-widest text-[#00ff88]/60 uppercase mb-4">Agent Marketplace</p>
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          13 specialized agents,
          <br />
          <span className="text-white/40">all working together.</span>
        </h2>
        <p className="text-white/40 max-w-xl mx-auto">
          Each agent is purpose-built for a specific business function and orchestrated by NEXUS Core.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {AGENTS.map(({ name, tag, color, description, tasks }) => (
          <div
            key={name}
            className="border border-white/8 rounded-2xl p-6 bg-white/2 hover:border-white/15 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-white">{name}</span>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ color, backgroundColor: `${color}18` }}
              >
                {tag}
              </span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed mb-4">{description}</p>
            <ul className="space-y-1.5">
              {tasks.map((task) => (
                <li key={task} className="flex items-center gap-2 text-xs text-white/30">
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
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
