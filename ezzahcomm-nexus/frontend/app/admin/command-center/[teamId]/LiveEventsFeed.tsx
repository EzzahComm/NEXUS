'use client';

import { useEffect, useRef, useState } from 'react';

interface Event {
  id: string;
  type: string;
  from: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

const TYPE_COLOR: Record<string, string> = {
  task_complete: 'text-emerald-400',
  task_failed:   'text-red-400',
  task_update:   'text-blue-400',
  team_event:    'text-violet-400',
  alert:         'text-orange-400',
  broadcast:     'text-slate-400',
};

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function LiveEventsFeed({ teamId }: { teamId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const source = new EventSource(`${apiUrl}/api/events/stream`);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    const handler = (raw: MessageEvent) => {
      try {
        const msg = JSON.parse(raw.data) as Event & { team_id?: string };
        if (!msg.team_id || msg.team_id === teamId) {
          setEvents((prev) => [
            { ...msg, id: `${Date.now()}-${Math.random()}` },
            ...prev.slice(0, 99),
          ]);
        }
      } catch {}
    };

    source.addEventListener('task_complete', handler);
    source.addEventListener('task_failed',   handler);
    source.addEventListener('task_update',   handler);
    source.addEventListener('team_event',    handler);
    source.addEventListener('broadcast',     handler);
    source.addEventListener('alert',         handler);

    return () => source.close();
  }, [teamId]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-900">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
        <span className="text-slate-400 text-xs">{connected ? 'Connected' : 'Connecting...'}</span>
        <span className="ml-auto text-slate-600 text-xs">{events.length} events</span>
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto font-mono text-xs p-4 space-y-1.5"
      >
        {events.length === 0 ? (
          <p className="text-slate-600 text-center py-8">Waiting for events...</p>
        ) : (
          events.map((evt) => (
            <div key={evt.id} className="flex items-start gap-2">
              <span className="text-slate-600 shrink-0 mt-px">{timeLabel(evt.timestamp)}</span>
              <span className={`shrink-0 ${TYPE_COLOR[evt.type] ?? 'text-slate-500'}`}>
                [{evt.type}]
              </span>
              <span className="text-slate-400 shrink-0">{evt.from}</span>
              <span className="text-slate-500 truncate">
                {evt.payload?.event
                  ? String(evt.payload.event)
                  : evt.payload?.task_id
                    ? `task:${String(evt.payload.task_id).slice(0, 8)}`
                    : JSON.stringify(evt.payload).slice(0, 60)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
