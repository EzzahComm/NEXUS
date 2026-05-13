/**
 * NEXUS — Task Routes
 * GET    /api/tasks           — list tasks (filterable)
 * GET    /api/tasks/:id       — get task detail + result
 * PATCH  /api/tasks/:id       — update status
 * DELETE /api/tasks/:id       — cancel task
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../server';

export const tasksRouter = Router();

// GET /api/tasks
tasksRouter.get('/', async (req, res) => {
  const { status, priority, project_id, limit = '50', offset = '0' } = req.query;

  let query = supabase
    .from('tasks')
    .select('id, task_type, title, status, priority, created_at, completed_at, project_id', { count: 'exact' })
    .eq('tenant_id', req.user!.tenant_id)
    .order('created_at', { ascending: false })
    .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

  if (status) query = query.eq('status', status as string);
  if (priority) query = query.eq('priority', priority as string);
  if (project_id) query = query.eq('project_id', project_id as string);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ tasks: data, total: count });
});

// GET /api/tasks/:id
tasksRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', req.params.id)
    .eq('tenant_id', req.user!.tenant_id)
    .single();

  if (error) return res.status(404).json({ error: 'Task not found' });
  return res.json(data);
});

// PATCH /api/tasks/:id
tasksRouter.patch('/:id', async (req, res) => {
  const { status } = z.object({
    status: z.enum(['cancelled']),
  }).parse(req.body);

  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', req.params.id)
    .eq('tenant_id', req.user!.tenant_id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});
