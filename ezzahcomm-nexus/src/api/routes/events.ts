/**
 * NEXUS — SSE Live Events Stream
 *
 * GET /api/events/stream         — SSE feed of all agent events
 * GET /api/events/stream/:agent  — SSE feed for specific agent/team
 * GET /api/events/history        — recent event history
 */

import { Router } from 'express';
import { getOrchestrator } from '../../runtime/orchestrator';
import type { AgentMessage } from '../../runtime/event-bus';

export const eventsRouter = Router();

// SSE heartbeat interval (ms)
const HEARTBEAT_MS = 25_000;

function sendEvent(res: import('express').Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// ── GET /api/events/stream ────────────────────────────────

eventsRouter.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const tenantId = req.user!.tenant_id;

  // Initial ping
  sendEvent(res, 'connected', { tenant_id: tenantId, ts: Date.now() });

  // Subscribe to broadcast events
  const orchestrator = getOrchestrator();
  const eventBus = orchestrator.getEventBus();

  const handler = (msg: AgentMessage) => {
    // Only stream events relevant to this tenant (or global broadcasts)
    sendEvent(res, msg.type, msg);
  };

  eventBus.subscribe('broadcast', handler);
  eventBus.subscribe(tenantId, handler);

  // Heartbeat to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    // handlers auto-cleanup on next pub
  });
});

// ── GET /api/events/stream/:agent ────────────────────────

eventsRouter.get('/stream/:agent', (req, res) => {
  const { agent } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  sendEvent(res, 'connected', { agent, ts: Date.now() });

  const orchestrator = getOrchestrator();
  const eventBus = orchestrator.getEventBus();

  const handler = (msg: AgentMessage) => sendEvent(res, msg.type, msg);
  eventBus.subscribe(agent, handler);

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), HEARTBEAT_MS);
  req.on('close', () => clearInterval(heartbeat));
});

// ── GET /api/events/history ───────────────────────────────

eventsRouter.get('/history', async (req, res) => {
  const count = Math.min(parseInt(String(req.query.count ?? '100'), 10), 500);
  const agent = req.query.agent as string | undefined;

  try {
    const orchestrator = getOrchestrator();
    const eventBus = orchestrator.getEventBus();

    const events = agent
      ? await eventBus.getRecentEvents(agent, count)
      : await eventBus.getGlobalFeed(count);

    return res.json({ events, count: events.length });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});
