import { Router } from 'express';
import { supabase } from '../server';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const checks: Record<string, string> = { api: 'ok' };

  try {
    await supabase.from('system_events').select('id').limit(1);
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  const healthy = Object.values(checks).every(v => v === 'ok');
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    version: process.env.npm_package_version || '2.0.0',
    timestamp: new Date().toISOString(),
  });
});
