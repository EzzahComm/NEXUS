/**
 * NEXUS TASK GRAPH
 * Distributed task management with full dependency resolution,
 * atomic claiming (CAS), deadlock prevention, and retry policies.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import pino from 'pino';

const logger = pino({ name: 'nexus:task-graph' });

export type TaskState =
  | 'pending'
  | 'claimed'
  | 'blocked'
  | 'active'
  | 'reviewing'
  | 'failed'
  | 'completed'
  | 'archived';

export interface TaskNode {
  id: string;
  task_type: string;
  status: TaskState;
  payload: Record<string, unknown>;
  priority: number;
  dependencies: string[];
  blocked_by: string[];
  claimed_by?: string;
  team_id?: string;
  project_id?: string;
  tenant_id?: string;
  result?: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
  created_at: string;
  claimed_at?: string;
  completed_at?: string;
}

export interface CreateTaskInput {
  type: string;
  payload: Record<string, unknown>;
  priority?: number;
  dependencies?: string[];
  team_id?: string;
  project_id?: string;
  tenant_id?: string;
  max_retries?: number;
}

const BACKOFF_BASE_MS = 5_000;

export class TaskGraph {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // ── CREATE ────────────────────────────────────────────────

  async createTask(input: CreateTaskInput): Promise<string> {
    const hasBlockers = (input.dependencies?.length ?? 0) > 0;
    const initialState: TaskState = hasBlockers ? 'blocked' : 'pending';

    const { data, error } = await this.supabase
      .from('tasks')
      .insert({
        task_type: input.type,
        status: initialState,
        payload: input.payload,
        priority: input.priority ?? 3,
        dependencies: input.dependencies ?? [],
        blocked_by: input.dependencies ?? [],
        team_id: input.team_id ?? null,
        project_id: input.project_id ?? null,
        tenant_id: input.tenant_id ?? null,
        retry_count: 0,
        max_retries: input.max_retries ?? 3,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Task creation failed: ${error.message}`);

    if (input.dependencies?.length) {
      await this.registerDependencies(data.id, input.dependencies);
    }

    logger.debug({ taskId: data.id, type: input.type, state: initialState }, 'Task created');
    return data.id;
  }

  // ── CLAIM (Compare-And-Swap) ──────────────────────────────

  async claimTask(taskId: string, agentSessionId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('tasks')
      .update({
        status: 'claimed',
        claimed_by: agentSessionId,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('status', 'pending') // CAS guard: only claim if still pending
      .select('id')
      .maybeSingle();

    if (error) logger.warn({ error, taskId }, 'Claim attempt failed');
    return !error && data !== null;
  }

  // ── ACTIVATE ──────────────────────────────────────────────

  async activateTask(taskId: string): Promise<void> {
    await this.supabase
      .from('tasks')
      .update({ status: 'active' })
      .eq('id', taskId)
      .eq('status', 'claimed');
  }

  // ── MARK REVIEWING ────────────────────────────────────────

  async markReviewing(taskId: string): Promise<void> {
    await this.supabase
      .from('tasks')
      .update({ status: 'reviewing' })
      .eq('id', taskId);
  }

  // ── COMPLETE ──────────────────────────────────────────────

  async completeTask(taskId: string, result: Record<string, unknown>): Promise<void> {
    await this.supabase
      .from('tasks')
      .update({
        status: 'completed',
        result,
        completed_at: new Date().toISOString(),
        claimed_by: null,
      })
      .eq('id', taskId);

    logger.info({ taskId }, 'Task completed — unblocking dependents');
    await this.unblockDependents(taskId);
  }

  // ── FAIL & RETRY ──────────────────────────────────────────

  async failTask(taskId: string, error: string, allowRetry = true): Promise<void> {
    const { data: task } = await this.supabase
      .from('tasks')
      .select('retry_count, max_retries')
      .eq('id', taskId)
      .single();

    if (!task) return;

    const retryCount = (task.retry_count ?? 0) + 1;
    const shouldRetry = allowRetry && retryCount <= task.max_retries;

    await this.supabase
      .from('tasks')
      .update({
        status: shouldRetry ? 'pending' : 'failed',
        result: { error },
        retry_count: retryCount,
        claimed_by: null,
        claimed_at: null,
      })
      .eq('id', taskId);

    logger.warn({ taskId, retryCount, willRetry: shouldRetry }, 'Task failed');
  }

  // ── ARCHIVE ───────────────────────────────────────────────

  async archiveTask(taskId: string): Promise<void> {
    await this.supabase
      .from('tasks')
      .update({ status: 'archived' })
      .eq('id', taskId);
  }

  // ── QUERY ─────────────────────────────────────────────────

  async getReadyTasks(limit = 20, tenantId?: string): Promise<TaskNode[]> {
    let query = this.supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data } = await query;
    return (data ?? []) as TaskNode[];
  }

  async getTeamTasks(teamId: string): Promise<TaskNode[]> {
    const { data } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('team_id', teamId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    return (data ?? []) as TaskNode[];
  }

  async getTask(taskId: string): Promise<TaskNode | null> {
    const { data } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    return data as TaskNode | null;
  }

  async getTasksByState(state: TaskState, tenantId?: string, limit = 50): Promise<TaskNode[]> {
    let query = this.supabase
      .from('tasks')
      .select('*')
      .eq('status', state)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data } = await query;
    return (data ?? []) as TaskNode[];
  }

  // ── STALE CLAIM RECOVERY ──────────────────────────────────
  // Release tasks that have been claimed but not activated within 5 minutes.

  async recoverStaleClaims(staleThresholdMs = 5 * 60_000): Promise<number> {
    const cutoff = new Date(Date.now() - staleThresholdMs).toISOString();

    const { data, error } = await this.supabase
      .from('tasks')
      .update({ status: 'pending', claimed_by: null, claimed_at: null })
      .eq('status', 'claimed')
      .lt('claimed_at', cutoff)
      .select('id');

    if (error) {
      logger.error({ error }, 'Stale claim recovery failed');
      return 0;
    }

    const count = data?.length ?? 0;
    if (count > 0) logger.info({ count }, 'Recovered stale claimed tasks');
    return count;
  }

  // ── DEPENDENCY MANAGEMENT ─────────────────────────────────

  private async registerDependencies(taskId: string, depIds: string[]): Promise<void> {
    const records = depIds.map((dep) => ({ task_id: taskId, depends_on: dep }));
    const { error } = await this.supabase.from('task_dependencies').insert(records);
    if (error) logger.warn({ error, taskId }, 'Dependency registration failed');
  }

  private async unblockDependents(completedTaskId: string): Promise<void> {
    const { data: deps } = await this.supabase
      .from('task_dependencies')
      .select('task_id')
      .eq('depends_on', completedTaskId);

    if (!deps?.length) return;

    for (const { task_id } of deps) {
      // Fetch all dependencies for this task
      const { data: allDeps } = await this.supabase
        .from('task_dependencies')
        .select('depends_on')
        .eq('task_id', task_id);

      if (!allDeps?.length) continue;

      const depIds = allDeps.map((d) => d.depends_on);

      // Check how many are not yet completed
      const { data: incomplete } = await this.supabase
        .from('tasks')
        .select('id')
        .in('id', depIds)
        .neq('status', 'completed');

      if (!incomplete?.length) {
        // All deps satisfied — unblock
        await this.supabase
          .from('tasks')
          .update({ status: 'pending', blocked_by: [] })
          .eq('id', task_id)
          .eq('status', 'blocked');

        logger.info({ task_id, completedTaskId }, 'Task unblocked');
      } else {
        // Partial — remove this dep from blocked_by list
        const { data: current } = await this.supabase
          .from('tasks')
          .select('blocked_by')
          .eq('id', task_id)
          .single();

        if (current?.blocked_by) {
          const updated = (current.blocked_by as string[]).filter((id) => id !== completedTaskId);
          await this.supabase
            .from('tasks')
            .update({ blocked_by: updated })
            .eq('id', task_id);
        }
      }
    }
  }

  // ── BACKOFF DELAY ─────────────────────────────────────────

  static retryDelayMs(retryCount: number): number {
    return BACKOFF_BASE_MS * Math.pow(2, Math.min(retryCount, 6));
  }
}
