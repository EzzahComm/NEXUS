#!/usr/bin/env ts-node
/**
 * NEXUS Deployment Validation
 * Run after deploy to verify all required services and config are in place.
 * Exit code 0 = pass, 1 = failures found.
 *
 * Usage: npx ts-node scripts/deployment-validation.ts
 */

import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import https from 'https';

// ── Colours ───────────────────────────────────────────────────
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';

let failures = 0;
let warnings = 0;

function pass(label: string, detail?: string): void {
  console.log(`  ${GREEN}✓${RESET} ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, detail?: string): void {
  failures++;
  console.log(`  ${RED}✗ FAIL${RESET} ${label}${detail ? ` — ${detail}` : ''}`);
}

function warn(label: string, detail?: string): void {
  warnings++;
  console.log(`  ${YELLOW}⚠ WARN${RESET} ${label}${detail ? ` — ${detail}` : ''}`);
}

function section(title: string): void {
  console.log(`\n${BOLD}${title}${RESET}`);
}

// ── 1. Environment variables ──────────────────────────────────
section('1. Environment Variables');

const REQUIRED_VARS: string[] = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'REDIS_URL',
  'ANTHROPIC_API_KEY',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_SHORTCODE',
  'MPESA_PASSKEY',
  'MPESA_CALLBACK_URL',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_WEBHOOK_SECRET',
  'TEXTSMS_API_KEY',
  'RESEND_API_KEY',
  'ALLOWED_ORIGINS',
];

const OPTIONAL_VARS: string[] = [
  'OPENAI_API_KEY',
  'SENTRY_DSN',
  'NODE_ENV',
  'LOG_LEVEL',
];

for (const v of REQUIRED_VARS) {
  if (process.env[v]) {
    pass(v);
  } else {
    fail(v, 'missing');
  }
}

for (const v of OPTIONAL_VARS) {
  if (process.env[v]) {
    pass(v);
  } else {
    warn(v, 'not set (optional)');
  }
}

// ── 2. JWT Secret strength ────────────────────────────────────
section('2. Secret Strength');

const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length >= 64) {
  pass('JWT_SECRET length', `${jwtSecret.length} chars`);
} else {
  fail('JWT_SECRET length', `${jwtSecret.length} chars — need 64+`);
}

const encKey = process.env.ENCRYPTION_KEY || '';
if (encKey.length >= 64) {
  pass('ENCRYPTION_KEY length', `${encKey.length} chars`);
} else {
  fail('ENCRYPTION_KEY length', `${encKey.length} chars — need 64+`);
}

const paystackKey = process.env.PAYSTACK_SECRET_KEY || '';
if (paystackKey.startsWith('sk_live_')) {
  pass('PAYSTACK_SECRET_KEY', 'live key');
} else if (paystackKey.startsWith('sk_test_')) {
  warn('PAYSTACK_SECRET_KEY', 'test key — not suitable for production');
} else {
  fail('PAYSTACK_SECRET_KEY', 'unrecognised prefix');
}

// ── 3. Redis ──────────────────────────────────────────────────
section('3. Redis Connectivity');

async function validateRedis(): Promise<void> {
  const redis = new Redis(process.env.REDIS_URL!, {
    connectTimeout: 5000,
    commandTimeout: 5000,
    lazyConnect: true,
    maxRetriesPerRequest: 0,
  });
  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong === 'PONG') pass('Redis ping');
    else fail('Redis ping', `unexpected response: ${pong}`);

    const info = await redis.info('server');
    const versionLine = info.split('\r\n').find((l) => l.startsWith('redis_version:'));
    pass('Redis version', versionLine?.split(':')[1]?.trim());
    await redis.quit();
  } catch (err) {
    redis.disconnect();
    fail('Redis connection', String(err));
  }
}

// ── 4. Supabase ───────────────────────────────────────────────
section('4. Supabase Connectivity');

async function validateSupabase(): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Check critical tables exist
  const tables = [
    'tenants', 'tasks', 'agents', 'nexus_memory',
    'sms_logs', 'card_transactions', 'mobile_money_transactions',
    'subscriptions', 'webhook_events', 'audit_logs',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      fail(`Table: ${table}`, error.message);
    } else {
      pass(`Table: ${table}`);
    }
  }

  // Check match_memory RPC exists
  const { error: rpcError } = await supabase.rpc('match_memory', {
    query_embedding: new Array(1536).fill(0),
    match_threshold: 0.9,
    match_count: 1,
  });

  if (rpcError && rpcError.message.includes('does not exist')) {
    fail('match_memory RPC', 'function not found — run supabase-hardening.sql');
  } else {
    pass('match_memory RPC');
  }
}

// ── 5. API endpoint ───────────────────────────────────────────
section('5. API Health');

async function validateApiEndpoint(): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.ezzahcomm.co.ke';
  const healthUrl = `${apiUrl}/health`;

  return new Promise((resolve) => {
    const req = https.get(healthUrl, { timeout: 10000 }, (res) => {
      if (res.statusCode === 200) {
        pass('API /health', `HTTP ${res.statusCode}`);
      } else {
        fail('API /health', `HTTP ${res.statusCode}`);
      }
      resolve();
    });
    req.on('error', (err) => {
      fail('API /health', err.message);
      resolve();
    });
    req.on('timeout', () => {
      req.destroy();
      fail('API /health', 'timeout after 10s');
      resolve();
    });
  });
}

// ── 6. CORS origin validation ─────────────────────────────────
section('6. CORS Configuration');

const allowedOrigins = process.env.ALLOWED_ORIGINS || '';
if (allowedOrigins.includes('localhost')) {
  fail('ALLOWED_ORIGINS', 'contains localhost — unsafe for production');
} else if (allowedOrigins.includes('ezzahcomm.co.ke')) {
  pass('ALLOWED_ORIGINS', allowedOrigins);
} else {
  warn('ALLOWED_ORIGINS', 'does not include production domain');
}

// ── 7. MPESA callback URL ─────────────────────────────────────
section('7. MPESA Configuration');

const callbackUrl = process.env.MPESA_CALLBACK_URL || '';
if (callbackUrl.startsWith('https://')) {
  pass('MPESA_CALLBACK_URL', callbackUrl);
} else if (callbackUrl.startsWith('http://')) {
  fail('MPESA_CALLBACK_URL', 'must be HTTPS for M-Pesa production');
} else {
  fail('MPESA_CALLBACK_URL', 'not set');
}

const mpesaEnv = process.env.MPESA_ENV || '';
if (mpesaEnv === 'production') {
  pass('MPESA_ENV', 'production');
} else {
  warn('MPESA_ENV', `${mpesaEnv || 'not set'} — should be "production" on VPS`);
}

// ── Run async checks ──────────────────────────────────────────
(async () => {
  await validateRedis();
  await validateSupabase();
  await validateApiEndpoint();

  // ── Summary ───────────────────────────────────────────────
  console.log(`\n${BOLD}── Summary ──────────────────────────────────────────${RESET}`);

  if (failures === 0 && warnings === 0) {
    console.log(`\n  ${GREEN}${BOLD}ALL CHECKS PASSED${RESET} — deployment is ready.\n`);
  } else if (failures === 0) {
    console.log(`\n  ${YELLOW}${BOLD}PASSED with ${warnings} warning(s)${RESET} — review before go-live.\n`);
  } else {
    console.log(`\n  ${RED}${BOLD}${failures} FAILURE(S), ${warnings} warning(s)${RESET} — fix before go-live.\n`);
  }

  process.exit(failures > 0 ? 1 : 0);
})();
