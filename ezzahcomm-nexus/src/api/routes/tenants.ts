/**
 * NEXUS — Tenant Routes
 * GET  /api/tenants/me        — current tenant profile
 * PUT  /api/tenants/me        — update settings
 * GET  /api/tenants/me/stats  — usage stats
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../server';
import { requireRole } from '../middleware/auth';

export const tenantsRouter = Router();

// GET /api/tenants/me
tenantsRouter.get('/me', async (req, res) => {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, subscription_plan, status, settings, created_at')
    .eq('id', req.user!.tenant_id)
    .single();

  if (error) return res.status(404).json({ error: 'Tenant not found' });
  return res.json(data);
});

// PUT /api/tenants/me
tenantsRouter.put('/me', requireRole('admin', 'super_admin'), async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    settings: z.record(z.unknown()).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from('tenants')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', req.user!.tenant_id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

// GET /api/tenants/me/stats
tenantsRouter.get('/me/stats', async (req, res) => {
  const tenantId = req.user!.tenant_id;

  const [tasks, deployments, campaigns, smsLogs] = await Promise.all([
    supabase.from('tasks').select('status', { count: 'exact' }).eq('tenant_id', tenantId),
    supabase.from('deployments').select('status', { count: 'exact' }).eq('tenant_id', tenantId),
    supabase.from('sms_campaigns').select('sent_count', { count: 'exact' }).eq('tenant_id', tenantId),
    supabase.from('sms_logs').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
  ]);

  return res.json({
    tasks_total: tasks.count ?? 0,
    deployments_total: deployments.count ?? 0,
    campaigns_total: campaigns.count ?? 0,
    sms_sent_total: smsLogs.count ?? 0,
    generated_at: new Date().toISOString(),
  });
});
