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

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const daraja = new DarajaService(supabase);
const paystack = new PaystackService(supabase);

// POST /api/webhooks/daraja
webhooksRouter.post('/daraja', async (req: Request, res: Response) => {
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
  const rawBody = JSON.stringify(req.body);

  if (!paystack.validateWebhook(rawBody, signature)) {
    logger.warn('Invalid Paystack webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    await paystack.processWebhook(req.body);
    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Paystack webhook error');
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});
