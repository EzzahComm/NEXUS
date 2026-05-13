/**
 * NEXUS Runtime Healthcheck
 * Checks Redis connectivity, Supabase, Claude API, and worker queue depth.
 * Used by Docker HEALTHCHECK and the /health endpoint.
 */

import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import Anthropic from '@anthropic-ai/sdk';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime_seconds: number;
  checks: Record<string, CheckResult>;
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  latency_ms?: number;
  error?: string;
  detail?: unknown;
}

const START_TIME = Date.now();

async function checkRedis(): Promise<CheckResult> {
  const redis = new Redis(process.env.REDIS_URL!, {
    connectTimeout: 3000,
    commandTimeout: 3000,
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 0,
  });

  const t = Date.now();
  try {
    await redis.connect();
    await redis.ping();
    const info = await redis.info('memory');
    const usedMemoryLine = info.split('\r\n').find((l) => l.startsWith('used_memory_human:'));
    await redis.quit();
    return {
      status: 'pass',
      latency_ms: Date.now() - t,
      detail: { memory: usedMemoryLine?.split(':')[1]?.trim() },
    };
  } catch (err) {
    redis.disconnect();
    return { status: 'fail', latency_ms: Date.now() - t, error: String(err) };
  }
}

async function checkSupabase(): Promise<CheckResult> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const t = Date.now();
  try {
    const { error } = await supabase.from('tenants').select('id').limit(1);
    if (error) throw error;
    return { status: 'pass', latency_ms: Date.now() - t };
  } catch (err) {
    return { status: 'fail', latency_ms: Date.now() - t, error: String(err) };
  }
}

async function checkClaude(): Promise<CheckResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: 'fail', error: 'ANTHROPIC_API_KEY not set' };
  }

  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const t = Date.now();
  try {
    const res = await Promise.race([
      claude.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Claude ping timeout')), 8000)
      ),
    ]);
    return {
      status: 'pass',
      latency_ms: Date.now() - t,
      detail: { model: res.model, stop_reason: res.stop_reason },
    };
  } catch (err) {
    return { status: 'fail', latency_ms: Date.now() - t, error: String(err) };
  }
}

async function checkQueueDepth(): Promise<CheckResult> {
  const redis = new Redis(process.env.REDIS_URL!, {
    connectTimeout: 3000,
    commandTimeout: 3000,
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 0,
  });

  const t = Date.now();
  try {
    await redis.connect();
    const waiting = await redis.llen('bull:nexus-tasks:wait');
    const active = await redis.llen('bull:nexus-tasks:active');
    const failed = await redis.zcard('bull:nexus-tasks:failed');
    await redis.quit();

    const status = failed > 100 ? 'warn' : 'pass';
    return {
      status,
      latency_ms: Date.now() - t,
      detail: { waiting, active, failed },
    };
  } catch (err) {
    redis.disconnect();
    return { status: 'fail', latency_ms: Date.now() - t, error: String(err) };
  }
}

export async function runHealthcheck(): Promise<HealthStatus> {
  const [redis, supabase, claude, queue] = await Promise.allSettled([
    checkRedis(),
    checkSupabase(),
    checkClaude(),
    checkQueueDepth(),
  ]);

  const checks: Record<string, CheckResult> = {
    redis: redis.status === 'fulfilled' ? redis.value : { status: 'fail', error: String((redis as PromiseRejectedResult).reason) },
    supabase: supabase.status === 'fulfilled' ? supabase.value : { status: 'fail', error: String((supabase as PromiseRejectedResult).reason) },
    claude: claude.status === 'fulfilled' ? claude.value : { status: 'fail', error: String((claude as PromiseRejectedResult).reason) },
    queue: queue.status === 'fulfilled' ? queue.value : { status: 'fail', error: String((queue as PromiseRejectedResult).reason) },
  };

  const statuses = Object.values(checks).map((c) => c.status);
  const overallStatus: HealthStatus['status'] =
    statuses.some((s) => s === 'fail') ? 'unhealthy' :
    statuses.some((s) => s === 'warn') ? 'degraded' : 'healthy';

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
    checks,
  };
}

// Run standalone: npx ts-node src/runtime/runtime-healthcheck.ts
if (require.main === module) {
  runHealthcheck().then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === 'unhealthy' ? 1 : 0);
  });
}
