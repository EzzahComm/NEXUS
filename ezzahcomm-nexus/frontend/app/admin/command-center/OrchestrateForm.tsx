'use client';

import { useState, useTransition } from 'react';
import { orchestrateTeam } from './actions';

const MODE_OPTIONS = [
  { value: 'autonomous', label: 'Autonomous', desc: 'NEXUS executes independently' },
  { value: 'interactive', label: 'Interactive', desc: 'Human-guided collaboration' },
  { value: 'audit', label: 'Audit', desc: 'Read-only system review' },
  { value: 'recovery', label: 'Recovery', desc: 'Repair failed pipelines' },
];

export default function OrchestrateForm() {
  const [objective, setObjective] = useState('');
  const [mode, setMode] = useState('autonomous');
  const [result, setResult] = useState<{ teamId?: string; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!objective.trim()) return;

    setResult(null);
    startTransition(async () => {
      const res = await orchestrateTeam({ objective: objective.trim(), mode });
      setResult(res);
      if (res.teamId) setObjective('');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2 block">
          Objective
        </label>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Describe what you want NEXUS to build or accomplish..."
          rows={3}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-colors"
          disabled={isPending}
        />
      </div>

      <div>
        <label className="text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2 block">
          Execution Mode
        </label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMode(opt.value)}
              className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                mode === opt.value
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-semibold">{opt.label}</div>
              <div className={`text-xs mt-0.5 ${mode === opt.value ? 'text-blue-600' : 'text-slate-400'}`}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !objective.trim()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
        >
          {isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Planning team...
            </>
          ) : (
            'Launch Agent Team'
          )}
        </button>

        {result?.error && (
          <p className="text-red-600 text-xs">{result.error}</p>
        )}

        {result?.teamId && (
          <p className="text-emerald-600 text-xs">
            Team launched →{' '}
            <a href={`/admin/command-center/${result.teamId}`} className="underline underline-offset-2 font-medium">
              {result.teamId.slice(0, 8)}
            </a>
          </p>
        )}
      </div>
    </form>
  );
}
