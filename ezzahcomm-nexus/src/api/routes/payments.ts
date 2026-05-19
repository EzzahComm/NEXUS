/**
 * NEXUS — Payments Routes
 * POST /api/payments/stk-push       — initiate M-Pesa STK Push
 * POST /api/payments/card/init      — initiate Paystack card transaction
 * GET  /api/payments/card/verify/:ref — verify Paystack transaction
 * GET  /api/payments/transactions    — list tenant transactions
 */

import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { DarajaService } from '../../integrations/payments/daraja';
import { PaystackService } from '../../integrations/payments/paystack';

export const paymentsRouter = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const daraja = new DarajaService(supabase);
const paystack = new PaystackService(supabase);

// POST /api/payments/stk-push
paymentsRouter.post('/stk-push', async (req, res) => {
  const schema = z.object({
    phone: z.string().min(9),
    amount: z.number().positive(),
    account_reference: z.string(),
    transaction_desc: z.string().optional().default('NEXUS Payment'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await daraja.stkPush({
      ...parsed.data,
      tenant_id: req.user!.tenant_id,
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    const message = String(err);
    if (message.includes('already pending')) {
      return res.status(409).json({ error: message });
    }
    return res.status(502).json({ error: message });
  }
});

// POST /api/payments/card/init
paymentsRouter.post('/card/init', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    amount: z.number().positive(),
    currency: z.enum(['KES', 'NGN', 'GHS', 'ZAR']).default('KES'),
    callback_url: z.string().url().optional(),
    plan: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await paystack.initializeTransaction({
      ...parsed.data,
      tenant_id: req.user!.tenant_id,
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(502).json({ error: String(err) });
  }
});

// GET /api/payments/card/verify/:reference
paymentsRouter.get('/card/verify/:reference', async (req, res) => {
  try {
    const tx = await paystack.verifyTransaction(req.params.reference);
    return res.json({ success: true, transaction: tx });
  } catch (err) {
    return res.status(502).json({ error: String(err) });
  }
});

// GET /api/payments/transactions
paymentsRouter.get('/transactions', async (req, res) => {
  const { type = 'all', limit = '20' } = req.query;
  const tenantId = req.user!.tenant_id;
  const results: Record<string, unknown> = {};

  if (type === 'all' || type === 'mpesa') {
    const { data } = await supabase
      .from('mobile_money_transactions')
      .select('id, phone, amount, status, mpesa_receipt, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));
    results.mpesa = data;
  }

  if (type === 'all' || type === 'card') {
    const { data } = await supabase
      .from('card_transactions')
      .select('id, email, amount, currency, status, reference, paid_at, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));
    results.card = data;
  }

  return res.json(results);
});
