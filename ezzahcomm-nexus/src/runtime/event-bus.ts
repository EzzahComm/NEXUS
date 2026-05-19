/**
 * NEXUS EVENT BUS
 * Redis Streams-based inter-agent communication.
 * Supports direct messaging, broadcast, request/response,
 * and audit logging of all agent interactions.
 */

import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({ name: 'nexus:event-bus' });

export type MessageType =
  | 'task_update'
  | 'task_complete'
  | 'task_failed'
  | 'handoff'
  | 'broadcast'
  | 'request'
  | 'response'
  | 'alert'
  | 'heartbeat'
  | 'team_event';

export interface AgentMessage {
  id?: string;
  from: string;
  to: string | 'broadcast';
  type: MessageType;
  payload: Record<string, unknown>;
  priority: 'high' | 'normal' | 'low';
  team_id?: string;
  correlation_id?: string;
  timestamp: string;
}

export type MessageHandler = (msg: AgentMessage) => void | Promise<void>;

const GLOBAL_STREAM = 'nexus:events:all';
const STREAM_TTL_SECONDS = 7 * 24 * 3600; // 7 days
const MAX_STREAM_LENGTH = 10_000;

export class EventBus {
  private redis: Redis;
  private subscriber: Redis;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reading = false;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, { lazyConnect: true });
    this.subscriber = new Redis(redisUrl, { lazyConnect: true });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
    await this.subscriber.connect();
    logger.info('EventBus connected to Redis');
  }

  // ── PUBLISH ───────────────────────────────────────────────

  async publish(message: AgentMessage): Promise<string> {
    const serialized = JSON.stringify({ ...message, timestamp: message.timestamp || new Date().toISOString() });

    // Write to recipient-specific stream
    const recipientStream = `nexus:events:${message.to}`;
    const msgId = await this.redis.xadd(
      recipientStream,
      'MAXLEN', '~', String(MAX_STREAM_LENGTH),
      '*',
      'data', serialized
    );

    // Mirror to global audit stream
    await this.redis.xadd(
      GLOBAL_STREAM,
      'MAXLEN', '~', String(MAX_STREAM_LENGTH),
      '*',
      'data', serialized
    );

    // Notify registered handlers immediately via pub/sub channel
    await this.redis.publish(`nexus:notify:${message.to}`, serialized);
    if (message.to !== 'broadcast') {
      await this.redis.publish('nexus:notify:broadcast', serialized);
    }

    return msgId ?? '';
  }

  async broadcast(from: string, type: MessageType, payload: Record<string, unknown>, teamId?: string): Promise<void> {
    await this.publish({
      from,
      to: 'broadcast',
      type,
      payload,
      priority: 'normal',
      team_id: teamId,
      timestamp: new Date().toISOString(),
    });
  }

  async request(
    from: string,
    to: string,
    payload: Record<string, unknown>,
    timeoutMs = 30_000
  ): Promise<AgentMessage | null> {
    const correlationId = `${from}-${Date.now()}`;

    await this.publish({
      from,
      to,
      type: 'request',
      payload,
      priority: 'high',
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
    });

    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), timeoutMs);

      this.once(from, (msg) => {
        if (msg.type === 'response' && msg.correlation_id === correlationId) {
          clearTimeout(timer);
          resolve(msg);
          return true; // consumed
        }
        return false;
      });
    });
  }

  // ── SUBSCRIBE ─────────────────────────────────────────────

  subscribe(agentId: string, handler: MessageHandler): void {
    const existing = this.handlers.get(agentId) ?? [];
    existing.push(handler);
    this.handlers.set(agentId, existing);

    // Subscribe to pub/sub channels for real-time delivery
    this.subscriber.subscribe(`nexus:notify:${agentId}`, 'nexus:notify:broadcast');
    if (!this.reading) this.startPubSubReading();
  }

  private startPubSubReading(): void {
    this.reading = true;
    this.subscriber.on('message', (_channel: string, raw: string) => {
      try {
        const msg = JSON.parse(raw) as AgentMessage;
        const targets = new Set([msg.to, 'broadcast']);
        for (const target of targets) {
          const handlers = this.handlers.get(target) ?? [];
          for (const h of handlers) {
            Promise.resolve(h(msg)).catch((err) =>
              logger.error({ err, msgType: msg.type }, 'Handler error')
            );
          }
        }
      } catch {}
    });
  }

  // ── ONE-SHOT LISTENER ────────────────────────────────────

  private once(agentId: string, predicate: (msg: AgentMessage) => boolean): void {
    const wrapper: MessageHandler = (msg) => {
      const consumed = predicate(msg);
      if (consumed) {
        const handlers = this.handlers.get(agentId) ?? [];
        const idx = handlers.indexOf(wrapper);
        if (idx !== -1) handlers.splice(idx, 1);
      }
    };
    this.subscribe(agentId, wrapper);
  }

  // ── HISTORY ───────────────────────────────────────────────

  async getRecentEvents(agentId: string, count = 50): Promise<AgentMessage[]> {
    try {
      const stream = `nexus:events:${agentId}`;
      const results = await this.redis.xrevrange(stream, '+', '-', 'COUNT', count);
      return results
        .map(([, fields]) => {
          try { return JSON.parse(fields[1]) as AgentMessage; } catch { return null; }
        })
        .filter((m): m is AgentMessage => m !== null);
    } catch {
      return [];
    }
  }

  async getGlobalFeed(count = 100): Promise<AgentMessage[]> {
    try {
      const results = await this.redis.xrevrange(GLOBAL_STREAM, '+', '-', 'COUNT', count);
      return results
        .map(([, fields]) => {
          try { return JSON.parse(fields[1]) as AgentMessage; } catch { return null; }
        })
        .filter((m): m is AgentMessage => m !== null);
    } catch {
      return [];
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
    await this.subscriber.quit();
  }
}

// Singleton
let _bus: EventBus | null = null;
export function getEventBus(): EventBus {
  if (!_bus) _bus = new EventBus(process.env.REDIS_URL!);
  return _bus;
}
