/**
 * EZZAHCOMM NEXUS — MEMORY ENGINE
 * Persistent semantic memory using Supabase + pgvector.
 * Stores, indexes, and retrieves project intelligence,
 * decisions, deployment history, and agent knowledge.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pino from 'pino';

const logger = pino({ name: 'nexus:memory-engine' });

export interface MemoryEntry {
  key: string;
  value: Record<string, unknown>;
  context: string;
  tenant_id?: string;
  project_id?: string;
  embedding?: number[];
}

export interface MemorySearchResult {
  id: string;
  key: string;
  value: Record<string, unknown>;
  context: string;
  similarity: number;
  created_at: string;
}

export class MemoryEngine {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY });
  }

  async init(): Promise<void> {
    logger.info('Memory engine initialized');
  }

  // ── STORE ─────────────────────────────────────────────────

  async store(entry: MemoryEntry): Promise<string> {
    let embedding: number[] | undefined;

    try {
      embedding = await this.embed(JSON.stringify(entry.value));
    } catch (err) {
      logger.warn({ err }, 'Embedding generation failed — storing without vector');
    }

    const { data, error } = await this.supabase
      .from('nexus_memory')
      .insert({
        key: entry.key,
        value: entry.value,
        context: entry.context,
        tenant_id: entry.tenant_id,
        project_id: entry.project_id,
        embedding,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Memory store failed: ${error.message}`);
    logger.debug({ key: entry.key }, 'Memory stored');
    return data.id;
  }

  // ── RETRIEVE BY QUERY (semantic) ──────────────────────────

  async retrieve(
    query: string,
    tenantId?: string,
    limit = 5
  ): Promise<Record<string, unknown>> {
    try {
      const queryEmbedding = await this.embed(query);

      const { data, error } = await this.supabase.rpc('match_memory', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        tenant_id_filter: tenantId ?? null,
      });

      if (error) throw error;
      return { results: data as MemorySearchResult[] };
    } catch (err) {
      logger.warn({ err }, 'Semantic search failed — falling back to key lookup');
      return this.retrieveByContext(query, tenantId, limit);
    }
  }

  // ── RETRIEVE BY CONTEXT (fallback) ────────────────────────

  async retrieveByContext(
    context: string,
    tenantId?: string,
    limit = 10
  ): Promise<Record<string, unknown>> {
    let query = this.supabase
      .from('nexus_memory')
      .select('id, key, value, context, created_at')
      .ilike('context', `%${context}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query;
    if (error) throw new Error(`Memory retrieval failed: ${error.message}`);
    return { results: data };
  }

  // ── GET BY KEY ────────────────────────────────────────────

  async get(key: string, tenantId?: string): Promise<Record<string, unknown> | null> {
    let query = this.supabase
      .from('nexus_memory')
      .select('*')
      .eq('key', key)
      .order('created_at', { ascending: false })
      .limit(1);

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data } = await query;
    return data?.[0] ?? null;
  }

  // ── UPDATE ────────────────────────────────────────────────

  async update(key: string, value: Record<string, unknown>, tenantId?: string): Promise<void> {
    const embedding = await this.embed(JSON.stringify(value)).catch(() => undefined);

    await this.supabase
      .from('nexus_memory')
      .update({ value, embedding, updated_at: new Date().toISOString() })
      .eq('key', key)
      .eq('tenant_id', tenantId ?? null);
  }

  // ── SNAPSHOT PROJECT STATE ────────────────────────────────

  async snapshotProject(projectId: string, tenantId: string): Promise<void> {
    const snapshot = {
      project_id: projectId,
      snapshot_time: new Date().toISOString(),
      type: 'project_snapshot',
    };

    await this.store({
      key: `project:${projectId}:snapshot:${Date.now()}`,
      value: snapshot,
      context: 'project_snapshot',
      tenant_id: tenantId,
      project_id: projectId,
    });
  }

  // ── EMBED ─────────────────────────────────────────────────

  private async embed(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text.slice(0, 8000),
    });
    return response.data[0].embedding;
  }
}
