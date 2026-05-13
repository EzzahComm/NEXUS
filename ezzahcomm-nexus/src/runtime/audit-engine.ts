/**
 * EZZAHCOMM NEXUS — AUDIT ENGINE
 * Self-auditing system for code quality, security posture,
 * performance issues, and technical debt detection.
 * Powers the self-improvement loop.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import pino from 'pino';
import type { AgentTask } from './orchestrator';

const logger = pino({ name: 'nexus:audit-engine' });

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AuditFinding {
  category: 'security' | 'performance' | 'architecture' | 'code_quality' | 'deployment';
  severity: AuditSeverity;
  title: string;
  description: string;
  recommendation: string;
  file_path?: string;
  auto_fixable: boolean;
}

export interface AuditReport {
  project_id?: string;
  tenant_id?: string;
  findings: AuditFinding[];
  score: number; // 0-100
  summary: string;
  generated_at: string;
}

const AUDIT_SYSTEM_PROMPT = `You are the NEXUS Audit Agent — an expert engineering quality reviewer.

Analyze the provided project context and return a JSON audit report with this exact structure:
{
  "findings": [
    {
      "category": "security|performance|architecture|code_quality|deployment",
      "severity": "critical|high|medium|low",
      "title": "Short title",
      "description": "What the problem is",
      "recommendation": "How to fix it",
      "file_path": "optional path",
      "auto_fixable": true|false
    }
  ],
  "score": 0-100,
  "summary": "One-paragraph executive summary"
}

Focus on: security vulnerabilities, missing RLS, unvalidated inputs, missing env vars,
outdated dependencies, poor error handling, missing logging, deployment risks.`;

export class AuditEngine {
  private supabase: SupabaseClient;
  private claude: Anthropic;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  // ── RUN SINGLE AUDIT ──────────────────────────────────────

  async run(task: AgentTask): Promise<Record<string, unknown>> {
    const report = await this.audit(task.payload, task.project_id, task.tenant_id);
    await this.persistReport(report);
    return report as unknown as Record<string, unknown>;
  }

  async audit(
    context: Record<string, unknown>,
    projectId?: string,
    tenantId?: string
  ): Promise<AuditReport> {
    const response = await this.claude.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-6',
      max_tokens: 4096,
      system: AUDIT_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: JSON.stringify({ project_id: projectId, context }),
      }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected Claude response type');

    const parsed = JSON.parse(content.text) as Omit<AuditReport, 'project_id' | 'tenant_id' | 'generated_at'>;

    return {
      ...parsed,
      project_id: projectId,
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
    };
  }

  // ── AUDIT ALL ACTIVE PROJECTS ─────────────────────────────

  async auditAllProjects(): Promise<void> {
    const { data: projects } = await this.supabase
      .from('projects')
      .select('id, name, tenant_id, description')
      .eq('status', 'active');

    if (!projects?.length) return;

    logger.info({ count: projects.length }, 'Auditing active projects');

    for (const project of projects) {
      try {
        const report = await this.audit(
          { name: project.name, description: project.description },
          project.id,
          project.tenant_id
        );
        await this.persistReport(report);

        const critical = report.findings.filter(f => f.severity === 'critical');
        if (critical.length > 0) {
          logger.warn({ projectId: project.id, count: critical.length }, 'Critical findings detected');
        }
      } catch (err) {
        logger.error({ err, projectId: project.id }, 'Project audit failed');
      }
    }
  }

  // ── PERSIST REPORT ────────────────────────────────────────

  private async persistReport(report: AuditReport): Promise<void> {
    const { error } = await this.supabase.from('audits').insert({
      project_id: report.project_id ?? null,
      tenant_id: report.tenant_id ?? null,
      findings: report.findings,
      score: report.score,
      summary: report.summary,
      resolved: false,
    });

    if (error) logger.error({ error }, 'Failed to persist audit report');
    else logger.info({ project_id: report.project_id, score: report.score }, 'Audit report saved');
  }

  // ── CLASSIFY SEVERITY ─────────────────────────────────────

  classifySeverity(finding: AuditFinding): AuditSeverity {
    if (finding.category === 'security') return 'critical';
    if (finding.category === 'deployment') return 'high';
    return finding.severity;
  }
}
