/**
 * EZZAHCOMM NEXUS — API SERVER
 * Production Express server: auth, routing, rate limiting, logging.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

import { authMiddleware } from './middleware/auth';
import { rateLimiter, strictRateLimiter } from './middleware/rateLimit';
import { healthRouter } from './routes/health';
import { agentsRouter } from './routes/agents';
import { tasksRouter } from './routes/tasks';
import { paymentsRouter } from './routes/payments';
import { smsRouter } from './routes/sms';
import { webhooksRouter } from './routes/webhooks';
import { tenantsRouter } from './routes/tenants';
import { teamsRouter } from './routes/teams';
import { eventsRouter } from './routes/events';

const logger = pino({ name: 'nexus:api', level: process.env.LOG_LEVEL || 'info' });

const app = express();
const PORT = parseInt(process.env.API_PORT || '4000', 10);

// ── SUPABASE CLIENT ───────────────────────────────────────────
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── CORE MIDDLEWARE ───────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') ?? [
  'http://localhost:3001',
  'http://localhost:3000',
];
// Always allow Vercel preview + production domains
const VERCEL_ORIGIN = /https:\/\/.*\.vercel\.app$/;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                         // same-origin / server-to-server
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    if (VERCEL_ORIGIN.test(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
}));

// Capture raw body for webhook HMAC validation before JSON parsing
app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));
app.use(rateLimiter);

// ── PUBLIC ROUTES ─────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/api/webhooks', webhooksRouter);   // webhooks before auth (Paystack, Daraja)

// ── PROTECTED ROUTES ─────────────────────────────────────────
app.use('/api', authMiddleware);
app.use('/api/agents', agentsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/sms', strictRateLimiter, smsRouter);
app.use('/api/tenants', tenantsRouter);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── ERROR HANDLER ─────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ── BOOT ──────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'NEXUS API server online');
  });
}

export default app;
