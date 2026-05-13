/**
 * EZZAHCOMM NEXUS — IMPROVEMENT ENGINE
 * Continuous self-improvement loop.
 * Consumes audit findings, generates optimization strategies,
 * and schedules auto-fix tasks back into the task queue.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import pino from 'pino';
import type { MemoryEngine } from './memory-engine';
import type { AuditFinding } from './audit-engine';

const logger = pino({ name: 'nexus:improvement-engine' });

export interface ImprovementStrategy {
  finding_id: string;
  strategy: string;
  implementation_steps: string[];
  estimated_effort: 'trivial' | 'low' | 'medium' | 'high';
  expected_impact: 'low' | 'medium' | 'high';
  auto_applicable: boolean;
}

const IMPROVEMENT_PROMPT = `You are the NEXUS Improvement Engine.

Given a list of audit findings, generate an improvement strategy for each.
Return JSON array of strategies:
[{
  "finding_id": "index of finding",
  "strategy": "What to do",
  "implementation_steps": ["step 1", "step 2", ...],
  "estimated_effort": "trivial|low|medium|high",
  "expected_impact": "low|medium|high",
  "auto_applicable": true|false
}]

Prioritize security findings first, then performance, then code quality.
Only set auto_applicable=true for trivial, non-breaking changes.`;

export class ImprovementEngine {
  private supabase: SupabaseClient;
  private claude: Anthropic;
  private memory: MemoryEngine;

  constructor(supabase: SupabaseClient, memory: MemoryEngine) {
    this.supabase = supabase;
    this.memory = memory;
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  // ── FULL IMPROVEMENT CYCLE ────────────────────────────────

  async runImprovementCycle(): Promise<void> {
    logger.info('Starting improvement cycle...');

    // Load unresolved audit findings
    const { data: audits } = await this.supabase
      .from('audits')
      .select('id, findings, project_id, tenant_id')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!audits?.length) {
      logger.info('No unresolved audits — system is clean.');
      return;
    }

    for (const audit of audits) {
      await this.processAudit(audit);
    }

    logger.info('Improvement cycle complete.');
  }

  // ── PROCESS SINGLE AUDIT ──────────────────────────────────

  private async processAudit(audit: {
    id: string;
    findings: AuditFinding[];
    project_id?: string;
    tenant_id?: string;
  }): Promise<void> {
    const strategies = await this.generateStrategies(audit.findings);

    // Persist strategies to memory
    await this.memory.store({
      key: `improvement:${audit.id}`,
      value: { strategies, audit_id: audit.id },
      context: 'improvement_strategy',
      tenant_id: audit.tenant_id,
      project_id: audit.project_id,
    });

    // Queue auto-applicable improvements
    const autoFixes = strategies.filter(s => s.auto_applicable);
    if (autoFixes.length > 0) {
      logger.info({ count: autoFixes.length, auditId: audit.id }, 'Queuing auto-fixes');
      for (const fix of autoFixes) {
        await this.supabase.from('tasks').insert({
          project_id: audit.project_id ?? null,
          tenant_id: audit.tenant_id ?? null,
          task_type: 'audit',
          payload: { improvement: fix, source_audit: audit.id },
          priority: 'medium',
          status: 'pending',
        });
      }
    }

    // Mark audit as processed (not necessarily resolved)
    await this.supabase.from('audits').update({ resolved: false }).eq('id', audit.id);
  }

  // ── GENERATE STRATEGIES ───────────────────────────────────

  async generateStrategies(findings: AuditFinding[]): Promise<ImprovementStrategy[]> {
    if (!findings.length) return [];

    const response = await this.claude.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-6',
      max_tokens: 4096,
      system: IMPROVEMENT_PROMPT,
      messages: [{
        role: 'user',
        content: JSON.stringify(findings),
      }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    try {
      return JSON.parse(content.text) as ImprovementStrategy[];
    } catch {
      logger.error({ raw: content.text }, 'Failed to parse improvement strategies');
      return [];
    }
  }

  // ── SELF-AUDIT PROMPT QUALITY ─────────────────────────────

  async auditPromptQuality(agentType: string, recentOutputs: string[]): Promise<string> {
    const response = await this.claude.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-6',
      max_tokens: 1024,
      system: 'You are a prompt quality reviewer. Analyze these agent outputs and suggest improvements to the system prompt.',
      messages: [{
        role: 'user',
        content: `Agent: ${agentType}\n\nOutputs:\n${recentOutputs.join('\n---\n')}`,
      }],
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }
}
