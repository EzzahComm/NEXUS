/**
 * EZZAHCOMM NEXUS — CORE ORCHESTRATOR
 * Central runtime coordinator for all agent execution,
 * task routing, workflow management, and system state.
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

const logger = pino({ name: 'nexus:orchestrator', level: process.env.LOG_LEVEL || 'info' });

export interface AgentTask {
  id: string;
  type: AgentType;
  project_id?: string;
  tenant_id?: string;
  payload: Record<string, unknown>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
}

export type AgentType =
  | 'architect'
  | 'backend'
  | 'frontend'
  | 'deployment'
  | 'security'
  | 'marketing'
  | 'analytics'
  | 'memory'
  | 'automation'
  | 'billing'
  | 'communication'
  | 'audit'
  | 'support';

export class NexusOrchestrator {
  private supabase;
  private taskEngine: TaskEngine;
  private memoryEngine: MemoryEngine;
  private auditEngine: AuditEngine;
  private improvementEngine: ImprovementEngine;
  private deploymentEngine: DeploymentEngine;
  private taskQueue: Queue;
  private isRunning = false;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.taskQueue = new Queue('nexus-tasks', {
      connection: { url: process.env.REDIS_URL },
    });

    this.taskEngine = new TaskEngine(this.supabase, this.taskQueue);
    this.memoryEngine = new MemoryEngine(this.supabase);
    this.auditEngine = new AuditEngine(this.supabase);
    this.improvementEngine = new ImprovementEngine(this.supabase, this.memoryEngine);
    this.deploymentEngine = new DeploymentEngine(this.supabase);
  }

  // ── BOOT ─────────────────────────────────────────────────

  async boot(): Promise<void> {
    logger.info('EZZAHCOMM NEXUS booting...');
    this.isRunning = true;

    await this.memoryEngine.init();
    await this.startWorker();
    this.registerScheduledJobs();

    logger.info('NEXUS runtime online. Autonomous execution active.');
  }

  // ── AUTONOMOUS EXECUTION LOOP ─────────────────────────────

  private async startWorker(): Promise<void> {
    const worker = new Worker(
      'nexus-tasks',
      async (job) => {
        const task = job.data as AgentTask;
        logger.info({ taskId: task.id, type: task.type }, 'Executing task');

        try {
          const result = await this.routeTask(task);
          await this.taskEngine.markComplete(task.id, result);
          await this.memoryEngine.store({
            key: `task:${task.id}:result`,
            value: result,
            context: task.type,
            tenant_id: task.tenant_id,
          });
        } catch (err) {
          logger.error({ err, taskId: task.id }, 'Task failed');
          await this.taskEngine.markFailed(task.id, String(err));
          await this.logSystemEvent('task_failed', { task_id: task.id, error: String(err) }, 'high');
        }
      },
      { connection: { url: process.env.REDIS_URL }, concurrency: 5 }
    );

    worker.on('failed', (job, err) => {
      logger.error({ job: job?.id, err }, 'Worker job failed');
    });
  }

  // ── TASK ROUTER ───────────────────────────────────────────

  async routeTask(task: AgentTask): Promise<Record<string, unknown>> {
    switch (task.type) {
      case 'deployment':
        return this.deploymentEngine.execute(task);
      case 'audit':
        return this.auditEngine.run(task);
      case 'memory':
        return this.memoryEngine.retrieve(task.payload.query as string, task.tenant_id);
      default:
        return this.taskEngine.delegateToAgent(task);
    }
  }

  // ── SCHEDULE AUTONOMOUS JOBS ──────────────────────────────

  private registerScheduledJobs(): void {
    // Daily: scan pending tasks
    cron.schedule('0 6 * * *', async () => {
      logger.info('Running daily task scan...');
      await this.taskEngine.scanPendingTasks();
    });

    // Every 6h: audit all active projects
    cron.schedule('0 */6 * * *', async () => {
      logger.info('Running project audit cycle...');
      await this.auditEngine.auditAllProjects();
    });

    // Weekly: full improvement cycle
    cron.schedule('0 3 * * 1', async () => {
      logger.info('Running weekly self-improvement cycle...');
      await this.improvementEngine.runImprovementCycle();
    });

    // Every 15m: health check
    cron.schedule('*/15 * * * *', async () => {
      await this.healthCheck();
    });
  }

  // ── HEALTH CHECK ─────────────────────────────────────────

  async healthCheck(): Promise<void> {
    try {
      const { error } = await this.supabase.from('system_events').select('id').limit(1);
      if (error) throw error;
    } catch (err) {
      logger.error({ err }, 'Health check failed');
      await this.logSystemEvent('health_check_failed', { error: String(err) }, 'critical');
    }
  }

  // ── SYSTEM EVENT LOGGER ───────────────────────────────────

  async logSystemEvent(
    event_type: string,
    payload: Record<string, unknown>,
    severity: 'info' | 'high' | 'critical' = 'info'
  ): Promise<void> {
    await this.supabase.from('system_events').insert({ event_type, payload, severity });
  }

  // ── DISPATCH TASK ─────────────────────────────────────────

  async dispatch(task: Omit<AgentTask, 'id' | 'status' | 'created_at'>): Promise<string> {
    const taskId = await this.taskEngine.create(task);
    await this.taskQueue.add(task.type, { ...task, id: taskId }, {
      priority: task.priority === 'critical' ? 1 : task.priority === 'high' ? 2 : 3,
    });
    return taskId;
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    await this.taskQueue.close();
    logger.info('NEXUS orchestrator shut down gracefully.');
  }
}

// ── ENTRY POINT ───────────────────────────────────────────

let _instance: NexusOrchestrator | null = null;
export function getOrchestrator(): NexusOrchestrator {
  if (!_instance) _instance = new NexusOrchestrator();
  return _instance;
}

if (require.main === module) {
  const nexus = getOrchestrator();
  nexus.boot().catch((err) => {
    logger.error(err, 'Fatal: NEXUS failed to boot');
    process.exit(1);
  });

  process.on('SIGTERM', () => nexus.shutdown());
  process.on('SIGINT', () => nexus.shutdown());
}
