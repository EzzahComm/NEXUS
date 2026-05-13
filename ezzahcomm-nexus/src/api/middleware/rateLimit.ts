/**
 * NEXUS — Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';

// General API: 120 req/min
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) => req.path === '/health',
});

// Strict: SMS, auth routes — 20 req/min
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for this endpoint.' },
});
