/**
 * NEXUS — Webhook Routes (no auth — validated by provider signatures)
 * POST /api/webhooks/daraja    — M-Pesa STK callback
 * POST /api/webhooks/paystack  — Paystack events
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { DarajaService } from '../../integrations/payments/daraja';
import { PaystackService } from '../../integrations/payments/paystack';
import pino from 'pino';

export const webhooksRouter = Router();
const logger = pino({ name: 'nexus:webhooks' });

// Safaricom's published callback IP range (can be overridden with MPESA_ALLOWED_IPS comma-separated)
const DEFAULT_DARAJA_IPS = [
  '196.201.214.200', '196.201.214.206', '196.201.213.114',
  '196.201.214.207', '196.201.214.208', '196.201.213.100',
  '196.201.214.209', '196.201.214.210',
];

const DARAJA_ALLOWED_IPS = new Set(
  (process.env.MPESA_ALLOWED_IPS || DEFAULT_DARAJA_IPS.join(','))
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
);

function darajaIpGuard(req: Request, res: Response, next: () => void): void {
  if (process.env.NODE_ENV !== 'production') return next();
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip ?? '';
  if (!DARAJA_ALLOWED_IPS.has(clientIp)) {
    logger.warn({ clientIp }, 'Daraja callback from unlisted IP — rejected');
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const daraja = new DarajaService(supabase);
const paystack = new PaystackService(supabase);

// POST /api/webhooks/daraja
webhooksRouter.post('/daraja', darajaIpGuard, async (req: Request, res: Response) => {
  try {
    await daraja.processCallback(req.body);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    logger.error({ err }, 'Daraja callback error');
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' }); // always 200 to Daraja
  }
});

// POST /api/webhooks/paystack
webhooksRouter.post('/paystack', async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string;
  // req.body is a Buffer here because server mounts express.raw() for /api/webhooks
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);

  if (!paystack.validateWebhook(rawBody, signature)) {
    logger.warn('Invalid Paystack webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const payload = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
    await paystack.processWebhook(payload);
    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Paystack webhook error');
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});
