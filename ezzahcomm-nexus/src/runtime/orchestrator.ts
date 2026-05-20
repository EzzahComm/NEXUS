/**
 * EZZAHCOMM NEXUS — CORE ORCHESTRATOR v3
 * Bootstraps and wires all NEXUS subsystems:
 * CommandCenter, EventBus, TaskGraph, ModelRouter, AgentRegistry,
 * TaskEngine, MemoryEngine, AuditEngine, ImprovementEngine, DeploymentEngine.
 */

import { createClient } from '@supabase/supabase-js';
import { Queue, Worker } from 'bullmq';
import cron from 'node-cron';
import pino from 'pino';

import { TaskEngine } from './task-engine';
import { MemoryEngine } from './memory-engine';
import { AuditEngine } from './audit-engine';
import { ImprovementEngine } from './improvement-engine';
import { DeploymentEngine } from './deployment-engine';
import { EventBus, getEventBus } from './event-bus';
import { TaskGraph } from './task-graph';
import { ModelRouter, getModelRouter } from './model-router';
import { CommandCenter, initCommandCenter, AGENT_SYSTEM_PROMPTS } from './command-center';
import { getAgentRegistry } from './agent-registry';

const logger = pino({ name: 'nexus:orchestrator', level: process.env.LOG_LEVEL || 'info' });

// ── TYPES ─────────────────────────────────────────────────

export type AgentType =
  | 'architect' | 'backend' | 'frontend' | 'devops' | 'security' | 'qa-testing'
  | 'product-manager' | 'data-analyst' | 'documentation' | 'research'
  | 'deployment' | 'marketing' | 'analytics' | 'memory' | 'automation'
  | 'billing' | 'communication' | 'audit' | 'support';

export interface AgentTask {
  id: string;
  type: AgentType;
  project_id?: string;
  tenant_id?: string;
  team_id?: string;
  payload: Record<string, unknown>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'claimed' | 'blocked' | 'active' | 'reviewing' | 'failed' | 'completed';
  created_at: string;
}

export type ExecutionMode =
  | 'interactive'     // human-in-the-loop
  | 'autonomous'      // full autonomous execution
  | 'audit'           // read-only auditing
  | 'recovery'        // repair mode
  | 'continuous';     // persistent background operations

// ── ORCHESTRATOR ──────────────────────────────────────────

export class NexusOrchestrator {
  private supabase;
  private taskEngine: TaskEngine;
  private memoryEngine: MemoryEngine;
  private auditEngine: AuditEngine;
  private improvementEngine: ImprovementEngine;
  private deploymentEngine: DeploymentEngine;
  private eventBus: EventBus;
  private taskGraph: TaskGraph;
  private modelRouter: ModelRouter;
  private commandCenter: CommandCenter;
  private taskQueue: Queue;
  private executionMode: ExecutionMode = 'interactive';
  private isRunning = false;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.taskQueue = new Queue('nexus-tasks', {
      connection: { url: process.env.REDIS_URL },
    });

    // Core subsystems
    this.memoryEngine = new MemoryEngine(this.supabase);
    this.auditEngine = new AuditEngine(this.supabase);
    this.improvementEngine = new ImprovementEngine(this.supabase, this.memoryEngine);
    this.deploymentEngine = new DeploymentEngine(this.supabase);

    // New multi-agent subsystems
    this.eventBus = getEventBus();
    this.taskGraph = new TaskGraph(this.supabase);
    this.modelRouter = getModelRouter();

    this.commandCenter = new CommandCenter(
      this.supabase,
      this.taskQueue,
      this.eventBus,
      this.taskGraph,
      this.modelRouter
    );
    initCommandCenter(this.commandCenter);

    // Task engine uses the new model router
    this.taskEngine = new TaskEngine(this.supabase, this.taskQueue, this.modelRouter, this.taskGraph);

    // Initialize agent registry
    getAgentRegistry();
  }

  // ── BOOT ─────────────────────────────────────────────────

  async boot(mode: ExecutionMode = 'interactive'): Promise<void> {
    logger.info({ mode }, 'EZZAHCOMM NEXUS booting...');
    this.executionMode = mode;
    this.isRunning = true;

    await this.memoryEngine.init();
    await this.eventBus.connect();
    await this.startWorker();
    this.registerScheduledJobs();
    this.setupEventHandlers();

    await this.logSystemEvent('nexus_boot', {
      mode,
      timestamp: new Date().toISOString(),
      version: '3.0.0',
    }, 'info');

    logger.info({ mode }, 'NEXUS runtime online. Autonomous execution active.');
  }

  // ── PARALLEL WORKER POOL ──────────────────────────────────

  private async startWorker(): Promise<void> {
    const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 10);

    const worker = new Worker(
      'nexus-tasks',
      async (job) => {
        const task = job.data as AgentTask;
        logger.info({ taskId: task.id, type: task.type, teamId: task.team_id }, 'Processing task');

        try {
          const result = await this.routeTask(task);

          await this.memoryEngine.store({
            key: `task:${task.id}:result`,
            value: result,
            context: task.type,
            tenant_id: task.tenant_id,
            project_id: task.project_id,
          }).catch(() => {});

          await this.eventBus.broadcast(task.type, 'task_complete', {
            task_id: task.id,
            team_id: task.team_id,
            result_summary: Object.keys(result),
          });

        } catch (err) {
          logger.error({ err, taskId: task.id }, 'Task failed');
          await this.logSystemEvent('task_failed', { task_id: task.id, error: String(err) }, 'high');

          await this.eventBus.broadcast(task.type, 'task_failed', {
            task_id: task.id,
            error: String(err),
            team_id: task.team_id,
          });
        }
      },
      { connection: { url: process.env.REDIS_URL }, concurrency }
    );

    worker.on('failed', (job, err) => {
      logger.error({ job: job?.id, err }, 'Worker job exhausted all retries');
    });

    logger.info({ concurrency }, 'Worker pool started');
  }

  // ── TASK ROUTER ───────────────────────────────────────────

  async routeTask(task: AgentTask): Promise<Record<string, unknown>> {
    switch (task.type) {
      case 'deployment':
        return this.deploymentEngine.execute(task as unknown as Parameters<typeof this.deploymentEngine.execute>[0]);

      case 'audit':
        return this.auditEngine.run(task as unknown as Parameters<typeof this.auditEngine.run>[0]);

      case 'memory':
        return this.memoryEngine.retrieve(task.payload.query as string, task.tenant_id);

      default:
        // Use CommandCenter for agent execution when part of a team
        if (task.team_id) {
          return this.commandCenter.executeAgentTask(
            task.type,
            task.id,
            task.payload,
            task.team_id
          );
        }
        // Fallback to legacy task engine
        return this.taskEngine.delegateToAgent(task);
    }
  }

  // ── AUTONOMOUS EXECUTION MODES ────────────────────────────

  async setMode(mode: ExecutionMode): Promise<void> {
    logger.info({ from: this.executionMode, to: mode }, 'Execution mode changed');
    this.executionMode = mode;

    await this.eventBus.broadcast('command-center', 'broadcast', {
      event: 'mode_changed',
      mode,
    });

    if (mode === 'recovery') {
      await this.runRecoveryMode();
    }
  }

  private async runRecoveryMode(): Promise<void> {
    logger.info('Recovery mode: scanning for failures...');

    // Recover stale claims
    const recovered = await this.taskGraph.recoverStaleClaims();

    // Re-audit failed projects
    await this.auditEngine.auditAllProjects();

    // Re-queue improvement cycle
    await this.improvementEngine.runImprovementCycle();

    logger.info({ recovered }, 'Recovery mode complete');
  }

  // ── DISPATCH (legacy + new) ───────────────────────────────

  async dispatch(task: Omit<AgentTask, 'id' | 'status' | 'created_at'>): Promise<string> {
    const taskId = await this.taskEngine.create(task);

    await this.taskQueue.add(
      task.type,
      { ...task, id: taskId },
      {
        priority: task.priority === 'critical' ? 1 : task.priority === 'high' ? 2 : 3,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      }
    );

    return taskId;
  }

  // Direct access to CommandCenter orchestrate
  async orchestrate(
    objective: string,
    context: Record<string, unknown> = {},
    projectId?: string,
    tenantId?: string
  ) {
    return this.commandCenter.orchestrate(objective, context, projectId, tenantId);
  }

  // ── EVENT HANDLERS ────────────────────────────────────────

  private setupEventHandlers(): void {
    this.eventBus.subscribe('command-center', async (msg) => {
      if (msg.type === 'alert' && msg.payload.severity === 'critical') {
        await this.logSystemEvent('agent_alert', msg.payload, 'critical');
      }
    });
  }

  // ── CRON JOBS ─────────────────────────────────────────────

  private registerScheduledJobs(): void {
    // Daily: scan pending tasks
    cron.schedule('0 6 * * *', async () => {
      logger.info('Daily task scan...');
      await this.taskEngine.scanPendingTasks();
    });

    // Every 15m: recover stale claims
    cron.schedule('*/15 * * * *', async () => {
      await this.taskGraph.recoverStaleClaims();
      await this.healthCheck();
    });

    // Every 6h: audit active projects
    cron.schedule('0 */6 * * *', async () => {
      if (this.executionMode === 'continuous' || this.executionMode === 'autonomous') {
        logger.info('Running project audit cycle...');
        await this.auditEngine.auditAllProjects();
      }
    });

    // Weekly: improvement cycle
    cron.schedule('0 3 * * 1', async () => {
      logger.info('Weekly self-improvement cycle...');
      await this.improvementEngine.runImprovementCycle();
    });

    logger.info('Scheduled jobs registered');
  }

  // ── HEALTH ────────────────────────────────────────────────

  async healthCheck(): Promise<{ status: 'ok' | 'degraded'; checks: Record<string, boolean> }> {
    const checks: Record<string, boolean> = {};

    try {
      const { error } = await this.supabase.from('system_events').select('id').limit(1);
      checks.database = !error;
    } catch {
      checks.database = false;
    }

    try {
      checks.redis = (await this.taskQueue.getWorkers()).length >= 0;
    } catch {
      checks.redis = false;
    }

    const allOk = Object.values(checks).every(Boolean);
    if (!allOk) {
      await this.logSystemEvent('health_degraded', checks, 'high');
    }

    return { status: allOk ? 'ok' : 'degraded', checks };
  }

  // ── OBSERVABILITY ─────────────────────────────────────────

  async getSystemStats(): Promise<Record<string, unknown>> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.taskQueue.getWaitingCount(),
      this.taskQueue.getActiveCount(),
      this.taskQueue.getCompletedCount(),
      this.taskQueue.getFailedCount(),
    ]);

    const activeSessions = this.commandCenter.getActiveSessions();
    const registryStats = getAgentRegistry().getStats();

    return {
      queue: { waiting, active, completed, failed },
      agents: {
        active_sessions: activeSessions.length,
        sessions: activeSessions,
      },
      skills: registryStats,
      execution_mode: this.executionMode,
      uptime_ms: process.uptime() * 1000,
    };
  }

  // ── ACCESSORS ─────────────────────────────────────────────

  getCommandCenter(): CommandCenter { return this.commandCenter; }
  getEventBus(): EventBus { return this.eventBus; }
  getTaskGraph(): TaskGraph { return this.taskGraph; }
  getModelRouter(): ModelRouter { return this.modelRouter; }
  getMemoryEngine(): MemoryEngine { return this.memoryEngine; }

  // ── SYSTEM EVENT ─────────────────────────────────────────

  async logSystemEvent(
    event_type: string,
    payload: Record<string, unknown>,
    severity: 'info' | 'high' | 'critical' = 'info'
  ): Promise<void> {
    const { error } = await this.supabase.from('system_events').insert({ event_type, payload, severity });
    if (error) {
      logger.warn({ err: error }, 'Failed to write system event');
    }
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    await this.taskQueue.close();
    await this.eventBus.disconnect();
    logger.info('NEXUS shut down gracefully.');
  }
}

// ── SINGLETON ─────────────────────────────────────────────

let _instance: NexusOrchestrator | null = null;
export function getOrchestrator(): NexusOrchestrator {
  if (!_instance) _instance = new NexusOrchestrator();
  return _instance;
}

if (require.main === module) {
  const nexus = getOrchestrator();
  const mode = (process.env.NEXUS_MODE as ExecutionMode) ?? 'interactive';

  nexus.boot(mode).catch((err) => {
    logger.error(err, 'Fatal: NEXUS failed to boot');
    process.exit(1);
  });

  process.on('SIGTERM', () => nexus.shutdown());
  process.on('SIGINT', () => nexus.shutdown());
}
