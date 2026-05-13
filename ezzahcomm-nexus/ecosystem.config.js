/**
 * EZZAHCOMM NEXUS — PM2 Ecosystem Config
 * Production process management for VPS deployments
 * Usage: pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    // ── NEXUS ORCHESTRATOR ──────────────────────────────────
    {
      name: 'nexus-orchestrator',
      script: 'dist/runtime/orchestrator.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        SERVICE: 'orchestrator',
      },
      max_memory_restart: '512M',
      restart_delay: 5000,
      max_restarts: 10,
      error_file: './logs/orchestrator-error.log',
      out_file: './logs/orchestrator-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch: false,
    },

    // ── NEXUS API SERVER ────────────────────────────────────
    {
      name: 'nexus-api',
      script: 'dist/api/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        SERVICE: 'api',
        API_PORT: 4000,
      },
      max_memory_restart: '256M',
      restart_delay: 3000,
      max_restarts: 15,
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch: false,
    },

    // ── NEXUS WORKER (BullMQ) ───────────────────────────────
    {
      name: 'nexus-worker',
      script: 'dist/runtime/task-engine.js',
      instances: 2,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        SERVICE: 'worker',
      },
      max_memory_restart: '384M',
      restart_delay: 5000,
      max_restarts: 10,
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch: false,
    },
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: process.env.VPS_HOST || 'your-vps-ip',
      ref: 'origin/main',
      repo: 'git@github.com:ezzahcomm/nexus.git',
      path: '/var/www/nexus',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};
