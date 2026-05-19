/**
 * NEXUS AGENT REGISTRY
 * Skill marketplace: registers reusable agent capabilities as named skills,
 * allows dynamic skill discovery, composition, and invocation.
 */

import pino from 'pino';
import type { AgentRole } from './command-center';

const logger = pino({ name: 'nexus:agent-registry' });

// ── TYPES ─────────────────────────────────────────────────

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  owner_role: AgentRole;
  input_schema: Record<string, string>;
  output_schema: Record<string, string>;
  tags: string[];
  version: string;
  invocations: number;
  avg_latency_ms: number;
  success_rate: number;
}

export type SkillHandler = (
  input: Record<string, unknown>
) => Promise<Record<string, unknown>>;

interface RegistryEntry {
  skill: AgentSkill;
  handler: SkillHandler;
}

// ── BUILT-IN SKILLS ───────────────────────────────────────

const BUILT_IN_SKILLS: Omit<AgentSkill, 'invocations' | 'avg_latency_ms' | 'success_rate'>[] = [
  {
    id: 'analyze-architecture',
    name: 'Analyze Architecture',
    description: 'Review codebase structure and identify architectural improvements',
    owner_role: 'architect',
    input_schema: { code_context: 'string', focus_areas: 'string[]' },
    output_schema: { findings: 'Finding[]', score: 'number', recommendations: 'string[]' },
    tags: ['architecture', 'analysis', 'review'],
    version: '1.0.0',
  },
  {
    id: 'generate-api-spec',
    name: 'Generate API Specification',
    description: 'Generate OpenAPI 3.0 spec from business requirements',
    owner_role: 'backend',
    input_schema: { requirements: 'string', existing_endpoints: 'string[]' },
    output_schema: { openapi_spec: 'object', endpoint_count: 'number' },
    tags: ['api', 'design', 'openapi'],
    version: '1.0.0',
  },
  {
    id: 'audit-rls-policies',
    name: 'Audit RLS Policies',
    description: 'Scan Supabase RLS policies for performance and security issues',
    owner_role: 'security',
    input_schema: { table_names: 'string[]', policy_definitions: 'string' },
    output_schema: { issues: 'PolicyIssue[]', severity: 'string', fixes: 'string[]' },
    tags: ['security', 'supabase', 'rls', 'performance'],
    version: '1.0.0',
  },
  {
    id: 'write-test-suite',
    name: 'Write Test Suite',
    description: 'Generate comprehensive test suite for a module or API',
    owner_role: 'qa-testing',
    input_schema: { module_code: 'string', test_types: 'string[]' },
    output_schema: { test_files: 'object', coverage_estimate: 'number' },
    tags: ['testing', 'quality', 'automation'],
    version: '1.0.0',
  },
  {
    id: 'generate-dockerfile',
    name: 'Generate Dockerfile',
    description: 'Create optimized multi-stage Dockerfile and docker-compose config',
    owner_role: 'devops',
    input_schema: { app_type: 'string', framework: 'string', env_vars: 'string[]' },
    output_schema: { dockerfile: 'string', compose_config: 'string' },
    tags: ['docker', 'deployment', 'devops'],
    version: '1.0.0',
  },
  {
    id: 'generate-docs',
    name: 'Generate Documentation',
    description: 'Auto-generate technical docs, README, and API references from code',
    owner_role: 'documentation',
    input_schema: { source_files: 'string[]', doc_type: 'string' },
    output_schema: { documentation: 'string', sections: 'string[]' },
    tags: ['docs', 'markdown', 'api-reference'],
    version: '1.0.0',
  },
  {
    id: 'create-sprint-plan',
    name: 'Create Sprint Plan',
    description: 'Break down a feature into sprint-ready user stories and tasks',
    owner_role: 'product-manager',
    input_schema: { feature_description: 'string', team_size: 'number', sprint_days: 'number' },
    output_schema: { stories: 'UserStory[]', sprint_capacity: 'number', risks: 'string[]' },
    tags: ['agile', 'sprint', 'planning', 'product'],
    version: '1.0.0',
  },
  {
    id: 'analyze-kpis',
    name: 'Analyze KPIs',
    description: 'Analyze business metrics and generate actionable insights',
    owner_role: 'data-analyst',
    input_schema: { metrics_data: 'object', time_period: 'string' },
    output_schema: { kpis: 'KPI[]', trends: 'string[]', recommendations: 'string[]' },
    tags: ['analytics', 'kpi', 'reporting', 'insights'],
    version: '1.0.0',
  },
  {
    id: 'security-scan',
    name: 'Security Vulnerability Scan',
    description: 'Scan code for OWASP Top 10 and common vulnerabilities',
    owner_role: 'security',
    input_schema: { code_snippets: 'string[]', framework: 'string' },
    output_schema: { vulnerabilities: 'Vuln[]', cvss_score: 'number', remediation: 'string[]' },
    tags: ['security', 'owasp', 'vulnerability', 'scan'],
    version: '1.0.0',
  },
  {
    id: 'optimize-query',
    name: 'Optimize Database Query',
    description: 'Analyze and optimize slow SQL queries, add indexes, improve RLS',
    owner_role: 'backend',
    input_schema: { query: 'string', explain_output: 'string', table_schema: 'string' },
    output_schema: { optimized_query: 'string', indexes: 'string[]', estimated_improvement: 'string' },
    tags: ['database', 'performance', 'sql', 'optimization'],
    version: '1.0.0',
  },
  {
    id: 'design-ui-component',
    name: 'Design UI Component',
    description: 'Design and generate React/TailwindCSS component code',
    owner_role: 'frontend',
    input_schema: { component_name: 'string', requirements: 'string', design_system: 'string' },
    output_schema: { component_code: 'string', props_interface: 'string', usage_example: 'string' },
    tags: ['ui', 'react', 'tailwind', 'component'],
    version: '1.0.0',
  },
  {
    id: 'ci-cd-pipeline',
    name: 'Generate CI/CD Pipeline',
    description: 'Create GitHub Actions or GitLab CI pipeline configurations',
    owner_role: 'devops',
    input_schema: { repo_type: 'string', deploy_targets: 'string[]', test_commands: 'string[]' },
    output_schema: { pipeline_yaml: 'string', stages: 'string[]', secrets_required: 'string[]' },
    tags: ['cicd', 'github-actions', 'deployment', 'automation'],
    version: '1.0.0',
  },
];

// ── REGISTRY ──────────────────────────────────────────────

export class AgentRegistry {
  private registry = new Map<string, RegistryEntry>();

  constructor() {
    this.loadBuiltIns();
    logger.info({ count: this.registry.size }, 'Agent registry initialized');
  }

  // ── REGISTER ──────────────────────────────────────────────

  register(skill: AgentSkill, handler: SkillHandler): void {
    this.registry.set(skill.id, { skill, handler });
    logger.debug({ skillId: skill.id, owner: skill.owner_role }, 'Skill registered');
  }

  // ── INVOKE ────────────────────────────────────────────────

  async invoke(skillId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const entry = this.registry.get(skillId);
    if (!entry) throw new Error(`Skill not found: ${skillId}`);

    const start = Date.now();
    try {
      const result = await entry.handler(input);
      const latency = Date.now() - start;

      entry.skill.invocations++;
      entry.skill.avg_latency_ms =
        Math.round((entry.skill.avg_latency_ms * (entry.skill.invocations - 1) + latency) / entry.skill.invocations);
      const prev = entry.skill.success_rate * (entry.skill.invocations - 1);
      entry.skill.success_rate = (prev + 1) / entry.skill.invocations;

      logger.debug({ skillId, latencyMs: latency }, 'Skill invoked');
      return result;
    } catch (err) {
      const prev = entry.skill.success_rate * entry.skill.invocations;
      entry.skill.invocations++;
      entry.skill.success_rate = prev / entry.skill.invocations;
      throw err;
    }
  }

  // ── DISCOVERY ─────────────────────────────────────────────

  list(filters?: { role?: AgentRole; tags?: string[] }): AgentSkill[] {
    let skills = Array.from(this.registry.values()).map((e) => e.skill);

    if (filters?.role) {
      skills = skills.filter((s) => s.owner_role === filters.role);
    }

    if (filters?.tags?.length) {
      skills = skills.filter((s) => filters.tags!.some((tag) => s.tags.includes(tag)));
    }

    return skills.sort((a, b) => b.success_rate - a.success_rate);
  }

  get(skillId: string): AgentSkill | undefined {
    return this.registry.get(skillId)?.skill;
  }

  searchByTags(tags: string[]): AgentSkill[] {
    return this.list({ tags });
  }

  getForRole(role: AgentRole): AgentSkill[] {
    return this.list({ role });
  }

  getStats(): { total: number; byRole: Record<string, number>; topSkills: AgentSkill[] } {
    const skills = Array.from(this.registry.values()).map((e) => e.skill);
    const byRole: Record<string, number> = {};
    for (const s of skills) {
      byRole[s.owner_role] = (byRole[s.owner_role] ?? 0) + 1;
    }
    const topSkills = [...skills].sort((a, b) => b.invocations - a.invocations).slice(0, 5);
    return { total: skills.length, byRole, topSkills };
  }

  // ── BUILT-IN LOADER ───────────────────────────────────────

  private loadBuiltIns(): void {
    for (const def of BUILT_IN_SKILLS) {
      const skill: AgentSkill = {
        ...def,
        invocations: 0,
        avg_latency_ms: 0,
        success_rate: 1.0,
      };
      // Built-ins use a stub handler — real execution goes through TaskEngine
      const handler: SkillHandler = async (input) => ({
        skill_id: skill.id,
        skill_name: skill.name,
        input,
        note: 'Execute via task dispatch for full agent reasoning',
      });
      this.registry.set(skill.id, { skill, handler });
    }
  }
}

// Singleton
let _registry: AgentRegistry | null = null;
export function getAgentRegistry(): AgentRegistry {
  if (!_registry) _registry = new AgentRegistry();
  return _registry;
}
