# Billing Audit — EZZAHCOMM NEXUS
**Date:** 2026-05-14

---

## M-Pesa (Daraja) Integration

### Findings

| # | Severity | Issue |
|---|---|---|
| 1 | HIGH | No idempotency check — duplicate STK Push requests can create duplicate `mobile_money_transactions` records |
| 2 | HIGH | Callback doesn't validate `MerchantRequestID` against stored record before updating |
| 3 | MEDIUM | `MPESA_B2C_SECURITY_CREDENTIAL` is blank — B2C payouts will crash |
| 4 | MEDIUM | `querySTKStatus()` exists but is never called — no polling for stuck payments |
| 5 | LOW | Access token cached in instance memory — not shared across PM2 worker processes |

### Fix 1 — Idempotency on STK Push

```typescript
// Before inserting, check for existing pending transaction:
const { data: existing } = await this.supabase
  .from('mobile_money_transactions')
  .select('id, status')
  .eq('account_reference', request.account_reference)
  .eq('phone', request.phone)
  .eq('status', 'pending')
  .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
  .single();

if (existing) {
  logger.warn({ existing }, 'Duplicate STK Push blocked — pending transaction exists');
  throw new Error('A payment for this account is already pending. Please wait.');
}
```

### Fix 2 — Token Caching in Redis (cluster-safe)

```typescript
private async getAccessToken(): Promise<string> {
  const cached = await this.redis?.get('mpesa:access_token');
  if (cached) return cached;

  // ... fetch new token
  await this.redis?.setex('mpesa:access_token', data.expires_in - 60, data.access_token);
  return data.access_token;
}
```

### Fix 3 — Stuck Payment Recovery

Add to orchestrator cron (every 30 min):
```typescript
cron.schedule('*/30 * * * *', async () => {
  const { data: stuck } = await supabase
    .from('mobile_money_transactions')
    .select('checkout_request_id')
    .eq('status', 'pending')
    .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

  for (const tx of stuck ?? []) {
    await daraja.querySTKStatus(tx.checkout_request_id);
  }
});
```

---

## Paystack Integration

### Findings

| # | Severity | Issue |
|---|---|---|
| 1 | HIGH | `subscription.create` webhook handler inserts subscription without `tenant_id` — cross-tenant data leak |
| 2 | HIGH | `amount * 100` in `initializeTransaction` — JSDoc says "in kobo" but function multiplies again |
| 3 | MEDIUM | No `reference` uniqueness check before initializing — duplicate references possible |
| 4 | MEDIUM | `subscription.disable` matches on `paystack_subscription_code` but no tenant scope |
| 5 | LOW | No webhook event logging — no audit trail of received events |

### Fix 1 — Subscription tenant isolation

```typescript
case 'subscription.create':
  await this.supabase.from('subscriptions').insert({
    paystack_subscription_code: txData.subscription_code,
    status: 'active',
    customer_email: (txData.customer as Record<string, unknown>)?.email,
    plan_code: (txData.plan as Record<string, unknown>)?.plan_code,
    // Look up tenant by email from card_transactions:
    tenant_id: await this.lookupTenantByEmail(
      (txData.customer as Record<string, unknown>)?.email as string
    ),
  });
```

### Fix 2 — Amount convention (breaking bug)

The interface comment says "in kobo (multiply by 100)" but the function ALSO multiplies by 100. Fix the comment — callers pass KES, function converts:

```typescript
// Remove misleading comment:
amount: number;  // in KES — function converts to kobo internally
```

### Fix 3 — Webhook event logging

```typescript
// At start of processWebhook():
await this.supabase.from('webhook_events').insert({
  provider: 'paystack',
  event_type: eventType,
  payload: event,
  received_at: new Date().toISOString(),
});
```

---

## Required Tables (not yet in migrations)

```sql
-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  paystack_subscription_code TEXT UNIQUE,
  customer_email TEXT,
  plan_code TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Webhook event log
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  received_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON subscriptions
  USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));
```

---

## Payment Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Duplicate STK Push charges | MEDIUM | HIGH | Idempotency check (not yet implemented) |
| Stuck pending payments | MEDIUM | MEDIUM | Poll cron (not yet implemented) |
| Paystack HMAC bypass | LOW | HIGH | Fixed — raw body now used |
| Cross-tenant subscription data | HIGH | HIGH | Fix needed in processWebhook |
| M-Pesa token not shared across cluster | HIGH | LOW | Redis token cache needed |
