/**
 * NEXUS MODEL ROUTER
 * Dynamic multi-model routing across Claude, GPT, and local models.
 * Routes by agent type, task complexity, cost, and capability requirements.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import pino from 'pino';

const logger = pino({ name: 'nexus:model-router' });

export type ModelProvider = 'anthropic' | 'openai';
export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'critical';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  maxTokens: number;
  costTier: number;      // 1=cheapest, 10=most expensive
  strengthScore: number; // 1-10 overall capability
  capabilities: string[];
  contextWindow: number;
}

export interface RoutingDecision {
  provider: ModelProvider;
  model: string;
  config: ModelConfig;
  reasoning: string;
}

export interface CallOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

// ── MODEL CATALOG ─────────────────────────────────────────

const CATALOG: ModelConfig[] = [
  {
    provider: 'anthropic',
    model: 'claude-opus-4-7',
    maxTokens: 32768,
    costTier: 10,
    strengthScore: 10,
    capabilities: ['reasoning', 'code', 'security', 'architecture', 'critical', 'audit'],
    contextWindow: 200_000,
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 16384,
    costTier: 4,
    strengthScore: 8,
    capabilities: ['reasoning', 'code', 'moderate', 'fast', 'general'],
    contextWindow: 200_000,
  },
  {
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 4096,
    costTier: 1,
    strengthScore: 5,
    capabilities: ['simple', 'fast', 'routing', 'classification', 'summarization'],
    contextWindow: 200_000,
  },
  {
    provider: 'openai',
    model: 'gpt-4o',
    maxTokens: 16384,
    costTier: 6,
    strengthScore: 8,
    capabilities: ['code', 'reasoning', 'multimodal', 'general'],
    contextWindow: 128_000,
  },
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 8192,
    costTier: 1,
    strengthScore: 6,
    capabilities: ['simple', 'fast', 'classification'],
    contextWindow: 128_000,
  },
];

// Per-agent preferred models — override for specialization
const AGENT_MODEL_MAP: Record<string, string> = {
  architect:        'claude-opus-4-7',
  security:         'claude-opus-4-7',
  audit:            'claude-opus-4-7',
  'qa-testing':     'claude-sonnet-4-6',
  backend:          'claude-sonnet-4-6',
  frontend:         'claude-sonnet-4-6',
  devops:           'claude-sonnet-4-6',
  'product-manager':'claude-sonnet-4-6',
  research:         'claude-sonnet-4-6',
  analytics:        'claude-sonnet-4-6',
  'data-analyst':   'claude-sonnet-4-6',
  marketing:        'claude-sonnet-4-6',
  documentation:    'claude-haiku-4-5-20251001',
  support:          'claude-sonnet-4-6',
  billing:          'claude-sonnet-4-6',
  communication:    'claude-haiku-4-5-20251001',
  memory:           'claude-haiku-4-5-20251001',
};

// ── CLASS ─────────────────────────────────────────────────

export class ModelRouter {
  private anthropic: Anthropic;
  private openai: OpenAI | null = null;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultHeaders: {
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
    });

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  // ── ROUTE ─────────────────────────────────────────────────

  route(agentType: string, complexity: TaskComplexity = 'moderate'): RoutingDecision {
    // Critical tasks always go to strongest model
    if (complexity === 'critical') {
      const cfg = this.findConfig('claude-opus-4-7')!;
      return { provider: 'anthropic', model: 'claude-opus-4-7', config: cfg, reasoning: 'Critical complexity → Opus' };
    }

    // Simple tasks: use cheapest capable model
    if (complexity === 'simple') {
      const cfg = this.findConfig('claude-haiku-4-5-20251001')!;
      return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', config: cfg, reasoning: 'Simple task → Haiku' };
    }

    const preferredModel = AGENT_MODEL_MAP[agentType] ?? 'claude-sonnet-4-6';
    const cfg = this.findConfig(preferredModel) ?? CATALOG[1];

    return {
      provider: cfg.provider,
      model: preferredModel,
      config: cfg,
      reasoning: `Agent '${agentType}' + complexity '${complexity}' → ${preferredModel}`,
    };
  }

  // ── CALL ──────────────────────────────────────────────────

  async call(
    decision: RoutingDecision,
    system: string,
    user: string,
    opts: CallOptions = {}
  ): Promise<string> {
    const maxTokens = opts.maxTokens ?? decision.config.maxTokens;
    const timeoutMs = opts.timeoutMs ?? 120_000;

    logger.debug({ model: decision.model, provider: decision.provider }, 'Model call');

    if (decision.provider === 'anthropic') {
      return this.callAnthropic(decision.model, system, user, maxTokens, timeoutMs);
    }

    if (decision.provider === 'openai' && this.openai) {
      return this.callOpenAI(decision.model, system, user, maxTokens, timeoutMs);
    }

    // Fallback: always have Anthropic as safety net
    logger.warn({ provider: decision.provider }, 'Provider unavailable — falling back to Sonnet');
    return this.callAnthropic('claude-sonnet-4-6', system, user, maxTokens, timeoutMs);
  }

  // Convenience: route + call in one step
  async invoke(
    agentType: string,
    system: string,
    user: string,
    complexity: TaskComplexity = 'moderate',
    opts: CallOptions = {}
  ): Promise<string> {
    const decision = this.route(agentType, complexity);
    return this.call(decision, system, user, opts);
  }

  // ── PROVIDERS ─────────────────────────────────────────────

  private async callAnthropic(
    model: string,
    system: string,
    user: string,
    maxTokens: number,
    timeoutMs: number
  ): Promise<string> {
    const response = await Promise.race([
      this.anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: [
          {
            type: 'text',
            text: system,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: user }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Anthropic timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);

    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }

  private async callOpenAI(
    model: string,
    system: string,
    user: string,
    maxTokens: number,
    timeoutMs: number
  ): Promise<string> {
    const response = await Promise.race([
      this.openai!.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`OpenAI timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);

    return response.choices[0].message.content ?? '';
  }

  // ── HELPERS ───────────────────────────────────────────────

  private findConfig(model: string): ModelConfig | undefined {
    return CATALOG.find((c) => c.model === model);
  }

  getCatalog(): ModelConfig[] {
    return CATALOG.filter((c) => {
      if (c.provider === 'openai') return this.openai !== null;
      return true;
    });
  }

  estimateCostTier(agentType: string, complexity: TaskComplexity): number {
    const decision = this.route(agentType, complexity);
    return decision.config.costTier;
  }
}

// Singleton
let _router: ModelRouter | null = null;
export function getModelRouter(): ModelRouter {
  if (!_router) _router = new ModelRouter();
  return _router;
}
