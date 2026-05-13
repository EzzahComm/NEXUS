/**
 * NEXUS — Agent Routes
 * POST /api/agents/dispatch  — dispatch a task to an agent
 * GET  /api/agents           — list available agent types
 * GET  /api/agents/:id       — get agent by ID
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../server';
import { getOrchestrator } from '../../runtime/orchestrator';

export const agentsRouter = Router();
const orchestrator = getOrchestrator();

const DispatchSchema = z.object({
  type: z.enum([
    'architect', 'backend', 'frontend', 'deployment',
    'security', 'marketing', 'analytics', 'memory',
    'automation', 'billing', 'communication', 'audit', 'support',
  ]),
  project_id: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
});

// POST /api/agents/dispatch
agentsRouter.post('/dispatch', async (req, res) => {
  const parsed = DispatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const taskId = await orchestrator.dispatch({
      ...parsed.data,
      tenant_id: req.user!.tenant_id,
    });
    return res.status(202).json({ task_id: taskId, status: 'queued' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// GET /api/agents
agentsRouter.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, type, capabilities, status, last_run_at, run_count')
    .eq('tenant_id', req.user!.tenant_id);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ agents: data });
});

// GET /api/agents/:id
agentsRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', req.params.id)
    .eq('tenant_id', req.user!.tenant_id)
    .single();

  if (error) return res.status(404).json({ error: 'Agent not found' });
  return res.json(data);
});
