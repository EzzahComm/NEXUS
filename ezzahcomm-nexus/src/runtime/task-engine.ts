/**
 * EZZAHCOMM NEXUS — TASK ENGINE
 * Manages task lifecycle: creation, routing, delegation,
 * prioritization, completion, and failure recovery.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import Anthropic from '@anthropic-ai/sdk';
import pino from 'pino';
import type { AgentTask, AgentType } from './orchestrator';

const logger = pino({ name: 'nexus:task-engine' });

const AGENT_PROMPTS: Record<AgentType, string> = {
  architect: 'You are the NEXUS Architect Agent. Analyze architecture, plan systems, reduce tech debt.',
  backend: 'You are the NEXUS Backend Agent. Build APIs, databases, authentication, and server logic.',
  frontend: 'You are the NEXUS Frontend Agent. Build React/Next.js UIs, components, and dashboards.',
  deployment: 'You are the NEXUS Deployment Agent. Manage VPS, Docker, PM2, NGINX, CI/CD pipelines.',
  security: 'You are the NEXUS Security Agent. Audit code, enforce RLS, harden auth, fix vulnerabilities.',
  marketing: 'You are the NEXUS Marketing Agent. Build funnels, automate campaigns, optimize conversions.',
  analytics: 'You are the NEXUS Analytics Agent. Build KPI dashboards, generate reports, track metrics.',
  memory: 'You are the NEXUS Memory Agent. Manage vector embeddings, retrieve context, persist knowledge.',
  automation: 'You are the NEXUS Automation Agent. Build workflows, integrations, and trigger systems.',
  billing: 'You are the NEXUS Billing Agent. Handle subscriptions, Daraja, Paystack, invoices.',
  communication: 'You are the NEXUS Communication Agent. Manage SMS, email, WhatsApp notifications.',
  audit: 'You are the NEXUS Audit Agent. Inspect code quality, performance, and system health.',
  support: `You are the NEXUS Support Agent (claude-sonnet-4-6).
For each inbound question:
1. Search the product docs and knowledge base in Notion for an answer. Quote the relevant passage and link to the source — never paraphrase policy from memory.
2. Draft a reply: direct answer first, then the supporting source link, then one proactive next step if relevant.
3. If you can't answer with ≥80% confidence, don't guess — post a handoff to the escalation channel with the full question, what you searched, what you found, and your best hypothesis. Tell the customer a human is taking a look.
Match the customer's tone. Be warm but don't pad. One emoji max.`,
};

export class TaskEngine {
  private supabase: SupabaseClient;
  private queue: Queue;
  private claude: Anthropic;

  constructor(supabase: SupabaseClient, queue: Queue) {
    this.supabase = supabase;
    this.queue = queue;
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  // ── CREATE ────────────────────────────────────────────────

  async create(task: Omit<AgentTask, 'id' | 'status' | 'created_at'>): Promise<string> {
    const { data, error } = await this.supabase
      .from('tasks')
      .insert({
        project_id: task.project_id,
        tenant_id: task.tenant_id,
        task_type: task.type,
        payload: task.payload,
        priority: task.priority,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw new Error(`Task creation failed: ${error.message}`);
    logger.info({ taskId: data.id, type: task.type }, 'Task created');
    return data.id;
  }

  // ── DELEGATE TO CLAUDE AGENT ──────────────────────────────

  async delegateToAgent(task: AgentTask): Promise<Record<string, unknown>> {
    const systemPrompt = AGENT_PROMPTS[task.type] ?? AGENT_PROMPTS.architect;

    const userMessage = JSON.stringify({
      task_id: task.id,
      context: task.payload,
      instructions: 'Analyze and respond with: { analysis, action_taken, recommendations, next_steps }',
    });

    const response = await this.claude.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

    try {
      return JSON.parse(content.text);
    } catch {
      return { raw_response: content.text };
    }
  }

  // ── STATUS MANAGEMENT ─────────────────────────────────────

  async markComplete(taskId: string, result: Record<string, unknown>): Promise<void> {
    await this.supabase
      .from('tasks')
      .update({ status: 'completed', result, completed_at: new Date().toISOString() })
      .eq('id', taskId);
    logger.info({ taskId }, 'Task completed');
  }

  async markFailed(taskId: string, error: string): Promise<void> {
    await this.supabase
      .from('tasks')
      .update({ status: 'failed', result: { error } })
      .eq('id', taskId);
    logger.warn({ taskId, error }, 'Task failed');
  }

  // ── AUTONOMOUS TASK SCANNER ───────────────────────────────

  async scanPendingTasks(): Promise<void> {
    const { data: tasks } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .limit(50);

    if (!tasks?.length) {
      logger.info('No pending tasks found.');
      return;
    }

    logger.info({ count: tasks.length }, 'Re-queuing pending tasks');

    for (const task of tasks) {
      await this.queue.add(task.task_type, task, {
        priority: task.priority === 'critical' ? 1 : 2,
      });
    }
  }

  // ── PRIORITIZE ────────────────────────────────────────────

  priorityScore(priority: AgentTask['priority']): number {
    return { critical: 0, high: 1, medium: 2, low: 3 }[priority];
  }
}
