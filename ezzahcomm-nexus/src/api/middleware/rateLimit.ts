/**
 * NEXUS — Rate Limiting Middleware
 * Uses Redis store so limits are shared across PM2 cluster workers.
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

let store: RedisStore | undefined;

try {
  const redis = new Redis(process.env.REDIS_URL!, { lazyConnect: true, enableOfflineQueue: false });
  // Adapt ioredis to the sendCommand interface expected by rate-limit-redis
  store = new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<unknown>,
  });
} catch {
  // Falls back to in-memory store if Redis is unavailable at startup
}

// General API: 120 req/min
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store,
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) => req.path === '/health',
});

// Strict: SMS, auth routes — 20 req/min
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store,
  message: { error: 'Rate limit exceeded for this endpoint.' },
});
