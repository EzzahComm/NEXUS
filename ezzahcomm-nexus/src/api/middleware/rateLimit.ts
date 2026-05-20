/**
 * NEXUS — Rate Limiting Middleware
 * Uses Redis store so limits are shared across PM2 cluster workers.
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

function createRedisStore(): RedisStore | undefined {
  if (!process.env.REDIS_URL) return undefined;
  try {
    // enableOfflineQueue true so commands issued before connect are queued
    const redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, enableOfflineQueue: true });
    return new RedisStore({
      sendCommand: (...args: string[]) =>
        (redis.call as any)(args[0], ...args.slice(1)) as Promise<any>,
    });
  } catch {
    return undefined;
  }
}

// Create separate store instances per limiter to avoid store reuse validation errors
const storeForGeneral = createRedisStore();
const storeForStrict = createRedisStore();

// General API: 120 req/min
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: storeForGeneral,
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) => req.path === '/health',
});

// Strict: SMS, auth routes — 20 req/min
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: storeForStrict,
  message: { error: 'Rate limit exceeded for this endpoint.' },
});
