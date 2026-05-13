/**
 * NEXUS — SMS Routes
 * POST /api/sms/send         — send single SMS
 * POST /api/sms/bulk         — bulk SMS
 * POST /api/sms/campaign     — create and send a campaign
 * GET  /api/sms/campaigns    — list campaigns
 * GET  /api/sms/logs         — SMS delivery logs
 */

import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { TextSMSService } from '../../integrations/sms/textsms';

export const smsRouter = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const sms = new TextSMSService(supabase);

// POST /api/sms/send
smsRouter.post('/send', async (req, res) => {
  const schema = z.object({
    to: z.string(),
    message: z.string().min(1).max(1600),
    sender_id: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await sms.send({ ...parsed.data, tenant_id: req.user!.tenant_id });
  return res.json(result);
});

// POST /api/sms/bulk
smsRouter.post('/bulk', async (req, res) => {
  const schema = z.object({
    to: z.array(z.string()).min(1).max(5000),
    message: z.string().min(1).max(1600),
    sender_id: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await sms.sendBulk({ ...parsed.data, tenant_id: req.user!.tenant_id });
  return res.json(result);
});

// POST /api/sms/campaign
smsRouter.post('/campaign', async (req, res) => {
  const schema = z.object({
    name: z.string(),
    message: z.string().min(1).max(1600),
    recipients: z.array(z.string()).min(1),
    scheduled_at: z.string().datetime().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const campaignId = await sms.sendCampaign({
      ...parsed.data,
      tenant_id: req.user!.tenant_id,
    });
    return res.status(202).json({ campaign_id: campaignId });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// GET /api/sms/campaigns
smsRouter.get('/campaigns', async (req, res) => {
  const { data, error } = await supabase
    .from('sms_campaigns')
    .select('id, name, recipient_count, sent_count, failed_count, status, created_at')
    .eq('tenant_id', req.user!.tenant_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ campaigns: data });
});

// GET /api/sms/logs
smsRouter.get('/logs', async (req, res) => {
  const { campaign_id, status, limit = '100' } = req.query;

  let query = supabase
    .from('sms_logs')
    .select('id, phone, status, message_id, created_at')
    .eq('tenant_id', req.user!.tenant_id)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit as string));

  if (campaign_id) query = query.eq('campaign_id', campaign_id as string);
  if (status) query = query.eq('status', status as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ logs: data });
});
