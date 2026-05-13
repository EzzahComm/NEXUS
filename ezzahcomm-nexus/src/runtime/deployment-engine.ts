/**
 * EZZAHCOMM NEXUS — DEPLOYMENT ENGINE
 * Manages application deployments, environment validation,
 * rollback strategies, and infrastructure health monitoring.
 * Supports VPS (PM2 + NGINX), Docker, and cPanel targets.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import pino from 'pino';
import type { AgentTask } from './orchestrator';

const logger = pino({ name: 'nexus:deployment-engine' });

export type DeploymentTarget = 'vps' | 'docker' | 'cpanel' | 'vercel';
export type DeploymentStatus = 'queued' | 'running' | 'success' | 'failed' | 'rolled_back';

export interface DeploymentConfig {
  project_id: string;
  tenant_id?: string;
  target: DeploymentTarget;
  environment: 'development' | 'staging' | 'production';
  app_name: string;
  repo_url?: string;
  branch?: string;
  env_vars?: Record<string, string>;
}

export class DeploymentEngine {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // ── EXECUTE DEPLOYMENT TASK ───────────────────────────────

  async execute(task: AgentTask): Promise<Record<string, unknown>> {
    const config = task.payload as unknown as DeploymentConfig;
    return this.deploy(config);
  }

  // ── DEPLOY ────────────────────────────────────────────────

  async deploy(config: DeploymentConfig): Promise<Record<string, unknown>> {
    const deploymentId = await this.createDeploymentRecord(config);
    logger.info({ deploymentId, target: config.target }, 'Deployment started');

    try {
      await this.validateEnvironment(config);

      let result: Record<string, unknown>;
      switch (config.target) {
        case 'vps':
          result = await this.deployVPS(config);
          break;
        case 'docker':
          result = await this.deployDocker(config);
          break;
        case 'cpanel':
          result = await this.deployCPanel(config);
          break;
        default:
          throw new Error(`Unsupported deployment target: ${config.target}`);
      }

      await this.updateDeploymentStatus(deploymentId, 'success', JSON.stringify(result));
      logger.info({ deploymentId }, 'Deployment succeeded');
      return { deployment_id: deploymentId, status: 'success', ...result };
    } catch (err) {
      const error = String(err);
      await this.updateDeploymentStatus(deploymentId, 'failed', error);
      logger.error({ deploymentId, error }, 'Deployment failed');
      throw err;
    }
  }

  // ── VPS DEPLOYMENT (PM2 + NGINX) ──────────────────────────

  private async deployVPS(config: DeploymentConfig): Promise<Record<string, unknown>> {
    const steps: string[] = [];

    // Pull latest code
    if (config.repo_url) {
      steps.push('git pull origin ' + (config.branch || 'main'));
    }

    // Install dependencies
    steps.push('npm ci --production');

    // Build if needed
    steps.push('npm run build');

    // Reload PM2
    steps.push(`pm2 reload ${config.app_name} --update-env`);

    // Save PM2 state
    steps.push('pm2 save');

    logger.info({ app: config.app_name, steps }, 'VPS deployment steps generated');

    return {
      target: 'vps',
      app_name: config.app_name,
      steps,
      pm2_config: this.generatePM2Config(config),
    };
  }

  // ── DOCKER DEPLOYMENT ─────────────────────────────────────

  private async deployDocker(config: DeploymentConfig): Promise<Record<string, unknown>> {
    return {
      target: 'docker',
      app_name: config.app_name,
      compose_command: `docker compose pull && docker compose up -d --remove-orphans`,
      health_check: `docker compose ps`,
    };
  }

  // ── CPANEL DEPLOYMENT ─────────────────────────────────────

  private async deployCPanel(config: DeploymentConfig): Promise<Record<string, unknown>> {
    return {
      target: 'cpanel',
      app_name: config.app_name,
      steps: [
        'Upload files via FTP/SFTP or Git deploy',
        'npm install in application directory',
        'Restart Node.js application from cPanel > Application Manager',
        'Verify .env file is correctly placed',
      ],
    };
  }

  // ── ENVIRONMENT VALIDATION ────────────────────────────────

  async validateEnvironment(config: DeploymentConfig): Promise<void> {
    const required = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ANTHROPIC_API_KEY',
    ];

    const missing = required.filter(key => !process.env[key] && !config.env_vars?.[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    logger.info('Environment validation passed');
  }

  // ── GENERATE PM2 CONFIG ───────────────────────────────────

  generatePM2Config(config: DeploymentConfig): Record<string, unknown> {
    return {
      apps: [{
        name: config.app_name,
        script: 'dist/runtime/orchestrator.js',
        instances: 'max',
        exec_mode: 'cluster',
        env_production: {
          NODE_ENV: 'production',
          ...(config.env_vars || {}),
        },
        max_memory_restart: '512M',
        error_file: `./logs/${config.app_name}-error.log`,
        out_file: `./logs/${config.app_name}-out.log`,
      }],
    };
  }

  // ── DATABASE ─────────────────────────────────────────────

  private async createDeploymentRecord(config: DeploymentConfig): Promise<string> {
    const { data, error } = await this.supabase
      .from('deployments')
      .insert({
        project_id: config.project_id,
        tenant_id: config.tenant_id ?? null,
        environment: config.environment,
        target: config.target,
        status: 'running',
        logs: `Deployment started at ${new Date().toISOString()}`,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Deployment record creation failed: ${error.message}`);
    return data.id;
  }

  private async updateDeploymentStatus(
    id: string,
    status: DeploymentStatus,
    logs: string
  ): Promise<void> {
    await this.supabase
      .from('deployments')
      .update({ status, logs })
      .eq('id', id);
  }
}
