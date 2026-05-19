/**
 * NEXUS COMMAND CENTER
 * Central supervisory orchestrator that creates agent teams,
 * decomposes objectives into task graphs, coordinates execution,
 * manages inter-agent communication, and synthesizes results.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import pino from 'pino';
import { EventBus } from './event-bus';
import { TaskGraph } from './task-graph';
import { ModelRouter } from './model-router';

const logger = pino({ name: 'nexus:command-center' });

// ── TYPES ─────────────────────────────────────────────────

export type AgentRole =
  // Engineering
  | 'architect'
  | 'backend'
  | 'frontend'
  | 'devops'
  | 'security'
  | 'qa-testing'
  // Business
  | 'product-manager'
  | 'data-analyst'
  | 'documentation'
  | 'research'
  | 'marketing'
  | 'analytics'
  // Operations
  | 'audit'
  | 'support'
  | 'billing'
  | 'communication'
  | 'memory'
  | 'automation';

export type TeamStatus = 'forming' | 'active' | 'reviewing' | 'completed' | 'dissolved' | 'failed';

export interface AgentTeam {
  id: string;
  name: string;
  objective: string;
  lead_agent: AgentRole;
  members: AgentRole[];
  status: TeamStatus;
  project_id?: string;
  tenant_id?: string;
  task_count: number;
  completed_tasks: number;
  created_at: string;
  completed_at?: string;
}

export interface AgentSession {
  id: string;
  agent_type: AgentRole | string;
  team_id?: string;
  status: 'idle' | 'active' | 'busy' | 'offline';
  current_task_id?: string;
  model: string;
  started_at: string;
  last_heartbeat: string;
}

export interface TeamBlueprintTask {
  type: AgentRole;
  payload: Record<string, unknown>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependsOn?: number[];  // zero-based indices into tasks array
}

export interface TeamBlueprint {
  objective: string;
  agents: AgentRole[];
  tasks: TeamBlueprintTask[];
  project_id?: string;
  tenant_id?: string;
}

const PRIORITY_MAP: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };

// ── AGENT SYSTEM PROMPTS ──────────────────────────────────

export const AGENT_SYSTEM_PROMPTS: Record<AgentRole, string> = {
  architect:
    `You are the NEXUS Backend Architect Agent. You design robust API architectures, database schemas, authentication systems, and microservice boundaries. For every task, return structured JSON with: analysis, proposed_design, implementation_steps, trade_offs, next_steps.`,

  backend:
    `You are the NEXUS Backend Engineer Agent. You build production-quality REST/GraphQL APIs, database models, authentication, and business logic in Node.js/TypeScript. Return JSON: { analysis, code_changes, files_affected, testing_notes, deployment_notes }.`,

  frontend:
    `You are the NEXUS Frontend Engineer Agent. You build responsive, accessible React/Next.js UIs using TailwindCSS. You handle state management, performance optimization, and UX best practices. Return JSON: { analysis, component_changes, styling_notes, accessibility_notes, testing_notes }.`,

  devops:
    `You are the NEXUS DevOps Agent. You manage Docker, Kubernetes, CI/CD pipelines, NGINX, PM2, and cloud infrastructure. You automate deployments and monitor system health. Return JSON: { analysis, infrastructure_changes, deployment_steps, monitoring_config, rollback_plan }.`,

  security:
    `You are the NEXUS Security Auditor Agent. You scan for vulnerabilities (OWASP Top 10), review RLS policies, audit authentication flows, detect exposed secrets, and verify RBAC. Return JSON: { vulnerabilities, severity_breakdown, remediation_steps, compliance_notes }.`,

  'qa-testing':
    `You are the NEXUS QA & Testing Agent. You design and implement unit, integration, E2E, and performance tests. You identify test coverage gaps and build automated validation suites. Return JSON: { test_plan, test_cases, coverage_analysis, automation_scripts }.`,

  'product-manager':
    `You are the NEXUS Product Manager Agent. You break down business requirements into actionable user stories, manage sprint planning, and define feature acceptance criteria. Return JSON: { user_stories, acceptance_criteria, sprint_tasks, dependencies, priority_rationale }.`,

  'data-analyst':
    `You are the NEXUS Data Analyst Agent. You design KPI dashboards, build data models, generate business intelligence reports, and create predictive analytics pipelines. Return JSON: { kpis, dashboard_config, data_model, insights, recommendations }.`,

  documentation:
    `You are the NEXUS Documentation Agent. You write clear technical documentation, API references, user manuals, and knowledge base articles. Return JSON: { document_type, content, sections, related_docs }.`,

  research:
    `You are the NEXUS Research Agent. You conduct web research, analyze competitive landscapes, evaluate best practices, and verify technical standards. Return JSON: { findings, sources, recommendations, confidence_level }.`,

  marketing:
    `You are the NEXUS Marketing Strategist Agent. You design conversion funnels, automate campaigns, optimize messaging, and build growth strategies. Return JSON: { strategy, channels, content_plan, kpis, timeline }.`,

  analytics:
    `You are the NEXUS Analytics Agent. You instrument applications, build tracking systems, analyze user behavior, and generate actionable insights. Return JSON: { metrics_tracked, analysis, trends, action_items }.`,

  audit:
    `You are the NEXUS Audit Agent. You perform comprehensive code quality reviews, performance analysis, security audits, and technical debt assessments. Return structured JSON with findings, scores (0-100), and auto-fixable recommendations.`,

  support:
    `You are the NEXUS Support Agent. You resolve customer issues, maintain knowledge bases, and handle escalations. Always: cite sources, be direct, max one emoji. If <80% confident, escalate. Return JSON: { response, sources, confidence, escalate }.`,

  billing:
    `You are the NEXUS Billing Agent. You manage subscription lifecycles, process payments via Daraja and Paystack, handle invoice generation, and resolve payment disputes. Return JSON: { analysis, action_taken, transaction_details }.`,

  communication:
    `You are the NEXUS Communication Agent. You manage SMS, email, and WhatsApp notifications. You optimize message delivery, handle failures, and maintain communication audit trails. Return JSON: { message_sent, channel, delivery_status, fallback_used }.`,

  memory:
    `You are the NEXUS Memory Agent. You manage semantic embeddings, vector retrieval, context indexing, and knowledge persistence. Return JSON: { stored_keys, retrieved_context, relevance_scores }.`,

  automation:
    `You are the NEXUS Automation Agent. You build workflow automations, webhook integrations, scheduled jobs, and event-driven trigger systems. Return JSON: { workflow_created, triggers, actions, expected_behavior }.`,
};

// ── COMMAND CENTER CLASS ───────────────────────────────────

export class CommandCenter {
  private supabase: SupabaseClient;
  private taskQueue: Queue;
  private eventBus: EventBus;
  private taskGraph: TaskGraph;
  private modelRouter: ModelRouter;
  private sessions = new Map<string, AgentSession>();

  constructor(
    supabase: SupabaseClient,
    taskQueue: Queue,
    eventBus: EventBus,
    taskGraph: TaskGraph,
    modelRouter: ModelRouter
  ) {
    this.supabase = supabase;
    this.taskQueue = taskQueue;
    this.eventBus = eventBus;
    this.taskGraph = taskGraph;
    this.modelRouter = modelRouter;
  }

  // ── ORCHESTRATE OBJECTIVE ─────────────────────────────────
  // Primary entry point: accepts a free-form objective, uses Opus to
  // decompose it into a team + task graph, then forms the team.

  async orchestrate(
    objective: string,
    context: Record<string, unknown> = {},
    projectId?: string,
    tenantId?: string
  ): Promise<AgentTeam> {
    logger.info({ objective }, 'Orchestrating objective');

    const planJson = await this.modelRouter.invoke(
      'architect',
      `You are NEXUS Command Center — the lead systems architect for an autonomous AI engineering platform.

Given a user objective, design the optimal agent team and task breakdown.

Return ONLY valid JSON in exactly this structure (no markdown, no prose):
{
  "lead_agent": "<agent_role>",
  "agents": ["<role1>", "<role2>"],
  "tasks": [
    {
      "type": "<agent_role>",
      "description": "<what this task accomplishes>",
      "payload": { "instruction": "<specific task instruction>", "context": {} },
      "priority": "critical|high|medium|low",
      "dependsOn": []
    }
  ]
}

Available roles: architect, backend, frontend, devops, security, qa-testing, product-manager, data-analyst, documentation, research, marketing, analytics, audit, support, billing, communication, memory, automation

Rules:
- Keep teams small (2-5 agents for simple objectives, up to 9 for complex)
- Use dependsOn indices (0-based) to model task ordering
- Each task payload.instruction must be specific and actionable
- Lead agent should be the most senior role for the objective`,
      JSON.stringify({ objective, context, project_id: projectId }),
      'complex'
    );

    let blueprint: TeamBlueprint;
    try {
      const parsed = JSON.parse(planJson) as {
        agents: AgentRole[];
        tasks: TeamBlueprintTask[];
      };
      blueprint = {
        objective,
        agents: parsed.agents,
        tasks: parsed.tasks,
        project_id: projectId,
        tenant_id: tenantId,
      };
    } catch (err) {
      logger.warn({ err, planJson: planJson.slice(0, 200) }, 'Plan parse failed — using fallback blueprint');
      blueprint = this.fallbackBlueprint(objective, context, projectId, tenantId);
    }

    return this.formTeam(blueprint);
  }

  // ── FORM TEAM FROM BLUEPRINT ──────────────────────────────

  async formTeam(blueprint: TeamBlueprint): Promise<AgentTeam> {
    const lead = blueprint.agents[0] ?? 'architect';

    const { data: team, error } = await this.supabase
      .from('agent_teams')
      .insert({
        name: `Team-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`,
        objective: blueprint.objective,
        lead_agent: lead,
        members: blueprint.agents,
        status: 'forming',
        project_id: blueprint.project_id ?? null,
        tenant_id: blueprint.tenant_id ?? null,
        task_count: blueprint.tasks.length,
        completed_tasks: 0,
      })
      .select()
      .single();

    if (error) throw new Error(`Team formation failed: ${error.message}`);

    logger.info({ teamId: team.id, members: blueprint.agents, taskCount: blueprint.tasks.length }, 'Team formed');

    // Create task dependency graph and enqueue ready tasks
    const taskIds: string[] = [];
    for (let i = 0; i < blueprint.tasks.length; i++) {
      const t = blueprint.tasks[i];
      const depIndices = t.dependsOn ?? [];
      const depTaskIds = depIndices.map((idx) => taskIds[idx]).filter(Boolean);

      const taskId = await this.taskGraph.createTask({
        type: t.type,
        payload: { ...t.payload, team_id: team.id },
        priority: PRIORITY_MAP[t.priority] ?? 3,
        dependencies: depTaskIds,
        team_id: team.id,
        project_id: blueprint.project_id,
        tenant_id: blueprint.tenant_id,
        max_retries: 3,
      });
      taskIds.push(taskId);

      // Enqueue immediately if no blockers
      if (!depTaskIds.length) {
        await this.taskQueue.add(
          t.type,
          {
            id: taskId,
            type: t.type,
            team_id: team.id,
            payload: t.payload,
            priority: t.priority,
            project_id: blueprint.project_id,
            tenant_id: blueprint.tenant_id,
          },
          {
            priority: PRIORITY_MAP[t.priority] ?? 3,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5_000 },
          }
        );
      }
    }

    // Activate team
    await this.supabase
      .from('agent_teams')
      .update({ status: 'active' })
      .eq('id', team.id);

    await this.eventBus.broadcast('command-center', 'team_event', {
      event: 'team_formed',
      team_id: team.id,
      objective: blueprint.objective,
      members: blueprint.agents,
      task_count: blueprint.tasks.length,
    });

    return { ...team, status: 'active' } as AgentTeam;
  }

  // ── EXECUTE AGENT TASK ────────────────────────────────────

  async executeAgentTask(
    agentType: AgentRole | string,
    taskId: string,
    payload: Record<string, unknown>,
    teamId?: string
  ): Promise<Record<string, unknown>> {
    const sessionId = await this.registerSession(agentType as AgentRole, teamId);
    const systemPrompt = AGENT_SYSTEM_PROMPTS[agentType as AgentRole] ?? AGENT_SYSTEM_PROMPTS.architect;

    await this.taskGraph.activateTask(taskId);
    await this.eventBus.broadcast(agentType, 'task_update', {
      event: 'task_started',
      task_id: taskId,
      agent: agentType,
      team_id: teamId,
    });

    try {
      const rawOutput = await this.modelRouter.invoke(
        agentType,
        systemPrompt,
        JSON.stringify({
          task_id: taskId,
          team_id: teamId,
          context: payload,
          instructions: payload.instruction ?? 'Analyze and respond with structured JSON output.',
        }),
        'moderate',
        { timeoutMs: 120_000 }
      );

      let result: Record<string, unknown>;
      try {
        result = JSON.parse(rawOutput);
      } catch {
        result = { raw_response: rawOutput, agent: agentType };
      }

      await this.taskGraph.completeTask(taskId, result);
      await this.onTaskCompleted(taskId, teamId);

      await this.eventBus.broadcast(agentType, 'task_complete', {
        event: 'task_completed',
        task_id: taskId,
        agent: agentType,
        team_id: teamId,
      });

      await this.endSession(sessionId);
      return result;
    } catch (err) {
      await this.taskGraph.failTask(taskId, String(err));

      await this.eventBus.broadcast(agentType, 'task_failed', {
        event: 'task_failed',
        task_id: taskId,
        agent: agentType,
        error: String(err),
        team_id: teamId,
      });

      await this.endSession(sessionId);
      throw err;
    }
  }

  // ── TEAM STATUS ───────────────────────────────────────────

  async getTeamStatus(teamId: string): Promise<{
    team: AgentTeam;
    tasks: Awaited<ReturnType<TaskGraph['getTeamTasks']>>;
    completion: number;
    activeSessions: AgentSession[];
  }> {
    const { data: team } = await this.supabase
      .from('agent_teams')
      .select('*')
      .eq('id', teamId)
      .single();

    const tasks = await this.taskGraph.getTeamTasks(teamId);
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const completion = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

    const activeSessions = Array.from(this.sessions.values()).filter(
      (s) => s.team_id === teamId && s.status !== 'offline'
    );

    // Auto-close team when 100% done
    if (completion === 100 && team?.status === 'active') {
      await this.supabase
        .from('agent_teams')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', teamId);

      await this.eventBus.broadcast('command-center', 'team_event', {
        event: 'team_completed',
        team_id: teamId,
        completion: 100,
      });
    }

    return { team: team as AgentTeam, tasks, completion, activeSessions };
  }

  async listTeams(tenantId?: string, status?: string): Promise<AgentTeam[]> {
    let query = this.supabase
      .from('agent_teams')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (tenantId) query = query.eq('tenant_id', tenantId);
    if (status) query = query.eq('status', status);

    const { data } = await query;
    return (data ?? []) as AgentTeam[];
  }

  async dissolveTeam(teamId: string): Promise<void> {
    await this.supabase
      .from('agent_teams')
      .update({ status: 'dissolved' })
      .eq('id', teamId);

    await this.eventBus.broadcast('command-center', 'team_event', {
      event: 'team_dissolved',
      team_id: teamId,
    });
  }

  // ── SESSION MANAGEMENT ────────────────────────────────────

  async registerSession(agentType: AgentRole | string, teamId?: string): Promise<string> {
    const routing = this.modelRouter.route(agentType);
    const sessionId = `${agentType}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const session: AgentSession = {
      id: sessionId,
      agent_type: agentType,
      team_id: teamId,
      status: 'active',
      model: routing.model,
      started_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);

    await this.supabase.from('agent_sessions').insert({
      session_id: sessionId,
      agent_type: agentType,
      team_id: teamId ?? null,
      status: 'active',
      model: routing.model,
    }).catch(() => {}); // Non-fatal

    return sessionId;
  }

  async heartbeat(sessionId: string): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (s) s.last_heartbeat = new Date().toISOString();
  }

  async endSession(sessionId: string): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (s) s.status = 'offline';

    await this.supabase
      .from('agent_sessions')
      .update({ status: 'offline', ended_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .catch(() => {});
  }

  getActiveSessions(): AgentSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.status !== 'offline');
  }

  // ── INTERNAL ──────────────────────────────────────────────

  private async onTaskCompleted(taskId: string, teamId?: string): Promise<void> {
    if (!teamId) return;

    await this.supabase
      .from('agent_teams')
      .update({ completed_tasks: this.supabase.rpc('increment', { x: 1 }) as unknown as number })
      .eq('id', teamId)
      .catch(() => {});

    // Re-enqueue any tasks that were blocked on this task
    const ready = await this.taskGraph.getReadyTasks(20);
    for (const t of ready.filter((t) => t.team_id === teamId)) {
      const claimed = await this.taskGraph.claimTask(t.id, 'orchestrator');
      if (claimed) {
        await this.taskQueue.add(
          t.task_type,
          {
            id: t.id,
            type: t.task_type,
            team_id: teamId,
            payload: t.payload,
            priority: t.priority,
          },
          {
            priority: t.priority,
            attempts: t.max_retries,
            backoff: { type: 'exponential', delay: 5_000 },
          }
        );
      }
    }
  }

  private fallbackBlueprint(
    objective: string,
    context: Record<string, unknown>,
    projectId?: string,
    tenantId?: string
  ): TeamBlueprint {
    return {
      objective,
      agents: ['architect', 'backend'],
      tasks: [
        {
          type: 'architect',
          payload: { instruction: `Analyze and plan: ${objective}`, context },
          priority: 'high',
        },
        {
          type: 'backend',
          payload: { instruction: `Implement: ${objective}`, context },
          priority: 'medium',
          dependsOn: [0],
        },
      ],
      project_id: projectId,
      tenant_id: tenantId,
    };
  }
}

// Singleton factory (wired up by orchestrator)
let _center: CommandCenter | null = null;
export function getCommandCenter(): CommandCenter | null {
  return _center;
}
export function initCommandCenter(cc: CommandCenter): void {
  _center = cc;
}
