/**
 * NEXUS — Agent Teams API
 *
 * POST /api/teams/orchestrate   — auto-plan + form team from objective
 * POST /api/teams               — form team from explicit blueprint
 * GET  /api/teams               — list teams (filter by status)
 * GET  /api/teams/:id           — get team + tasks + completion
 * DELETE /api/teams/:id         — dissolve team
 * GET  /api/teams/:id/tasks     — list team tasks
 * GET  /api/teams/sessions      — list active agent sessions
 * GET  /api/teams/registry      — list skill registry
 * GET  /api/teams/stats         — system stats
 */

import { Router } from 'express';
import { z } from 'zod';
import { getOrchestrator } from '../../runtime/orchestrator';
import { getAgentRegistry } from '../../runtime/agent-registry';
import type { AgentRole } from '../../runtime/command-center';

export const teamsRouter = Router();

// ── SCHEMA ────────────────────────────────────────────────

const AgentRoleValues = [
  'architect', 'backend', 'frontend', 'devops', 'security', 'qa-testing',
  'product-manager', 'data-analyst', 'documentation', 'research', 'marketing',
  'analytics', 'audit', 'support', 'billing', 'communication', 'memory', 'automation',
] as const;

const BlueprintTaskSchema = z.object({
  type: z.enum(AgentRoleValues),
  payload: z.record(z.unknown()),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  dependsOn: z.array(z.number().int().min(0)).default([]),
});

const BlueprintSchema = z.object({
  objective: z.string().min(10),
  agents: z.array(z.enum(AgentRoleValues)).min(1).max(12),
  tasks: z.array(BlueprintTaskSchema).min(1).max(20),
  project_id: z.string().uuid().optional(),
});

const OrchestrateSchema = z.object({
  objective: z.string().min(10),
  context: z.record(z.unknown()).default({}),
  project_id: z.string().uuid().optional(),
  mode: z.enum(['interactive', 'autonomous', 'audit', 'recovery', 'continuous']).optional(),
});

// ── POST /api/teams/orchestrate ───────────────────────────

teamsRouter.post('/orchestrate', async (req, res) => {
  const parsed = OrchestrateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { objective, context, project_id, mode } = parsed.data;
  const tenantId = req.user!.tenant_id;

  try {
    const orchestrator = getOrchestrator();

    if (mode) await orchestrator.setMode(mode);

    const team = await orchestrator.orchestrate(objective, context, project_id, tenantId);
    return res.status(202).json({ team });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── POST /api/teams ───────────────────────────────────────

teamsRouter.post('/', async (req, res) => {
  const parsed = BlueprintSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const tenantId = req.user!.tenant_id;

  try {
    const orchestrator = getOrchestrator();
    const team = await orchestrator.getCommandCenter().formTeam({
      ...parsed.data,
      agents: parsed.data.agents as AgentRole[],
      tasks: parsed.data.tasks as typeof parsed.data.tasks,
      tenant_id: tenantId,
    });
    return res.status(202).json({ team });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── GET /api/teams ────────────────────────────────────────

teamsRouter.get('/', async (req, res) => {
  const tenantId = req.user!.tenant_id;
  const status = req.query.status as string | undefined;

  try {
    const orchestrator = getOrchestrator();
    const teams = await orchestrator.getCommandCenter().listTeams(tenantId, status);
    return res.json({ teams, count: teams.length });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── GET /api/teams/sessions ───────────────────────────────

teamsRouter.get('/sessions', async (req, res) => {
  const orchestrator = getOrchestrator();
  const sessions = orchestrator.getCommandCenter().getActiveSessions();
  return res.json({ sessions, count: sessions.length });
});

// ── GET /api/teams/registry ───────────────────────────────

teamsRouter.get('/registry', async (req, res) => {
  const { role, tags } = req.query;
  const registry = getAgentRegistry();

  const skills = registry.list({
    role: role as AgentRole | undefined,
    tags: tags ? String(tags).split(',') : undefined,
  });

  return res.json({ skills, stats: registry.getStats() });
});

// ── GET /api/teams/stats ──────────────────────────────────

teamsRouter.get('/stats', async (req, res) => {
  try {
    const orchestrator = getOrchestrator();
    const stats = await orchestrator.getSystemStats();
    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── GET /api/teams/:id ────────────────────────────────────

teamsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const orchestrator = getOrchestrator();
    const status = await orchestrator.getCommandCenter().getTeamStatus(id);
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── DELETE /api/teams/:id ─────────────────────────────────

teamsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const orchestrator = getOrchestrator();
    await orchestrator.getCommandCenter().dissolveTeam(id);
    return res.json({ dissolved: true, team_id: id });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── GET /api/teams/:id/tasks ──────────────────────────────

teamsRouter.get('/:id/tasks', async (req, res) => {
  const { id } = req.params;
  const state = req.query.state as string | undefined;

  try {
    const orchestrator = getOrchestrator();
    const tasks = await orchestrator.getTaskGraph().getTeamTasks(id);
    const filtered = state ? tasks.filter((t) => t.status === state) : tasks;
    return res.json({ tasks: filtered, count: filtered.length });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});
