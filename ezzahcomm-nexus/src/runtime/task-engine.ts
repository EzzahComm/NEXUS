/**
 * EZZAHCOMM NEXUS — TASK ENGINE v3
 * Task lifecycle management with ModelRouter integration.
 * Supports all 18 agent types, new task states, and team context.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import pino from 'pino';
import { ModelRouter } from './model-router';
import { TaskGraph } from './task-graph';
import { AGENT_SYSTEM_PROMPTS } from './command-center';
import type { AgentTask, AgentType } from './orchestrator';

const logger = pino({ name: 'nexus:task-engine' });

const PRIORITY_MAP: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };

export class TaskEngine {
  private supabase: SupabaseClient;
  private queue: Queue;
  private modelRouter: ModelRouter;
  private taskGraph: TaskGraph;

  constructor(
    supabase: SupabaseClient,
    queue: Queue,
    modelRouter: ModelRouter,
    taskGraph: TaskGraph
  ) {
    this.supabase = supabase;
    this.queue = queue;
    this.modelRouter = modelRouter;
    this.taskGraph = taskGraph;
  }

  // ── CREATE TASK ───────────────────────────────────────────

  async create(task: Omit<AgentTask, 'id' | 'status' | 'created_at'>): Promise<string> {
    return this.taskGraph.createTask({
      type: task.type,
      payload: task.payload,
      priority: PRIORITY_MAP[task.priority] ?? 3,
      team_id: task.team_id,
      project_id: task.project_id,
      tenant_id: task.tenant_id,
    });
  }

  // ── DELEGATE TO AGENT ─────────────────────────────────────

  async delegateToAgent(task: AgentTask): Promise<Record<string, unknown>> {
    const agentType = task.type as AgentType;
    const systemPrompt = AGENT_SYSTEM_PROMPTS[agentType as keyof typeof AGENT_SYSTEM_PROMPTS]
      ?? AGENT_SYSTEM_PROMPTS.architect;

    const userMessage = JSON.stringify({
      task_id: task.id,
      team_id: task.team_id,
      project_id: task.project_id,
      context: task.payload,
      instructions: task.payload.instruction
        ?? 'Analyze and respond with: { analysis, action_taken, recommendations, next_steps }',
    });

    // Determine complexity from priority
    const complexity = task.priority === 'critical' ? 'critical'
      : task.priority === 'high' ? 'complex'
      : task.priority === 'low' ? 'simple'
      : 'moderate';

    try {
      const rawOutput = await this.modelRouter.invoke(
        agentType,
        systemPrompt,
        userMessage,
        complexity as 'simple' | 'moderate' | 'complex' | 'critical',
        { timeoutMs: 90_000 }
      );

      await this.markComplete(task.id, { raw_response: rawOutput }).catch(() => {});

      try {
        return JSON.parse(rawOutput);
      } catch {
        return { raw_response: rawOutput };
      }
    } catch (err) {
      await this.markFailed(task.id, String(err)).catch(() => {});
      throw err;
    }
  }

  // ── STATUS ────────────────────────────────────────────────

  async markComplete(taskId: string, result: Record<string, unknown>): Promise<void> {
    await this.taskGraph.completeTask(taskId, result);
    logger.info({ taskId }, 'Task completed');
  }

  async markFailed(taskId: string, error: string): Promise<void> {
    await this.taskGraph.failTask(taskId, error);
    logger.warn({ taskId, error }, 'Task failed');
  }

  // ── SCAN PENDING ──────────────────────────────────────────

  async scanPendingTasks(): Promise<void> {
    const tasks = await this.taskGraph.getReadyTasks(50);

    if (!tasks.length) {
      logger.info('No pending tasks found.');
      return;
    }

    logger.info({ count: tasks.length }, 'Re-queuing pending tasks');

    for (const task of tasks) {
      // Try to claim before re-queuing to avoid double-processing
      const claimed = await this.taskGraph.claimTask(task.id, 'scanner');
      if (!claimed) continue;

      await this.queue.add(
        task.task_type,
        {
          id: task.id,
          type: task.task_type,
          team_id: task.team_id,
          payload: task.payload,
          priority: task.priority,
          project_id: task.project_id,
          tenant_id: task.tenant_id,
        },
        {
          priority: task.priority,
          attempts: task.max_retries,
          backoff: { type: 'exponential', delay: TaskGraph.retryDelayMs(task.retry_count) },
          removeOnComplete: { age: 7 * 24 * 3600 },
          removeOnFail: { age: 30 * 24 * 3600 },
        }
      );
    }
  }

  // ── PRIORITY SCORE ────────────────────────────────────────

  priorityScore(priority: AgentTask['priority']): number {
    return PRIORITY_MAP[priority] ?? 3;
  }
}
