/**
 * NEXUS — PM2 Config (deployment/pm2.config.js)
 * Single-server / cPanel-compatible.
 * For full cluster: use root ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'nexus-api',
      script: '../dist/api/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', API_PORT: 4000 },
      max_memory_restart: '256M',
      error_file: '../logs/api-error.log',
      out_file: '../logs/api-out.log',
      watch: false,
    },
    {
      name: 'nexus-orchestrator',
      script: '../dist/runtime/orchestrator.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '512M',
      error_file: '../logs/orchestrator-error.log',
      out_file: '../logs/orchestrator-out.log',
      watch: false,
    },
  ],
};
