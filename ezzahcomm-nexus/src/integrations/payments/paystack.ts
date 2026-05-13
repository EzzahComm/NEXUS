/**
 * EZZAHCOMM NEXUS — PAYSTACK INTEGRATION
 * Card payments, recurring subscriptions, invoicing, webhooks.
 * Primary card billing gateway for NEXUS SaaS platform.
 */

import axios, { AxiosInstance } from 'axios';
import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import pino from 'pino';

const logger = pino({ name: 'nexus:paystack' });

export interface PaystackInitRequest {
  email: string;
  amount: number;           // in kobo (multiply by 100)
  currency?: 'NGN' | 'GHS' | 'KES' | 'ZAR';
  reference?: string;
  callback_url?: string;
  plan?: string;
  metadata?: Record<string, unknown>;
  tenant_id?: string;
}

export interface PaystackTransaction {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'abandoned';
  gateway_response: string;
  paid_at: string;
  channel: string;
  customer: {
    id: number;
    email: string;
    customer_code: string;
  };
  metadata?: Record<string, unknown>;
}

export interface SubscriptionPlan {
  name: string;
  amount: number;           // in kobo
  interval: 'daily' | 'weekly' | 'monthly' | 'annually';
  currency?: string;
  description?: string;
}

export class PaystackService {
  private client: AxiosInstance;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // ── INITIALIZE TRANSACTION ────────────────────────────────

  async initializeTransaction(req: PaystackInitRequest): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    const reference = req.reference || `NEX-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const { data } = await this.client.post('/transaction/initialize', {
      email: req.email,
      amount: req.amount * 100, // convert to kobo
      currency: req.currency || 'KES',
      reference,
      callback_url: req.callback_url,
      plan: req.plan,
      metadata: req.metadata,
    });

    if (!data.status) throw new Error(data.message);

    // Persist pending transaction
    await this.supabase.from('card_transactions').insert({
      tenant_id: req.tenant_id ?? null,
      email: req.email,
      amount: req.amount,
      currency: req.currency || 'KES',
      reference,
      status: 'pending',
      provider: 'paystack',
      metadata: req.metadata ?? {},
    });

    logger.info({ email: req.email, amount: req.amount, reference }, 'Paystack transaction initialized');
    return data.data;
  }

  // ── VERIFY TRANSACTION ────────────────────────────────────

  async verifyTransaction(reference: string): Promise<PaystackTransaction> {
    const { data } = await this.client.get(`/transaction/verify/${reference}`);
    if (!data.status) throw new Error(data.message);

    const tx = data.data as PaystackTransaction;

    await this.supabase
      .from('card_transactions')
      .update({
        status: tx.status,
        gateway_response: tx.gateway_response,
        paid_at: tx.paid_at,
        paystack_id: tx.id,
        channel: tx.channel,
      })
      .eq('reference', reference);

    logger.info({ reference, status: tx.status }, 'Paystack transaction verified');
    return tx;
  }

  // ── CREATE SUBSCRIPTION PLAN ──────────────────────────────

  async createPlan(plan: SubscriptionPlan): Promise<{ plan_code: string; id: number }> {
    const { data } = await this.client.post('/plan', {
      name: plan.name,
      amount: plan.amount * 100,
      interval: plan.interval,
      currency: plan.currency || 'KES',
      description: plan.description,
    });

    if (!data.status) throw new Error(data.message);
    logger.info({ plan_code: data.data.plan_code }, 'Paystack plan created');
    return data.data;
  }

  // ── CREATE CUSTOMER ───────────────────────────────────────

  async createCustomer(email: string, name?: string, phone?: string): Promise<{
    customer_code: string;
    id: number;
  }> {
    const { data } = await this.client.post('/customer', {
      email,
      first_name: name?.split(' ')[0],
      last_name: name?.split(' ').slice(1).join(' '),
      phone,
    });

    if (!data.status) throw new Error(data.message);
    return data.data;
  }

  // ── WEBHOOK VALIDATION ────────────────────────────────────

  validateWebhook(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET!)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }

  // ── PROCESS WEBHOOK EVENT ─────────────────────────────────

  async processWebhook(event: Record<string, unknown>): Promise<void> {
    const eventType = event.event as string;
    const txData = event.data as Record<string, unknown>;

    logger.info({ eventType }, 'Processing Paystack webhook');

    switch (eventType) {
      case 'charge.success':
        await this.supabase
          .from('card_transactions')
          .update({ status: 'success', processed_at: new Date().toISOString() })
          .eq('reference', txData.reference);
        break;

      case 'subscription.create':
        await this.supabase.from('subscriptions').insert({
          paystack_subscription_code: txData.subscription_code,
          status: 'active',
          customer_email: (txData.customer as Record<string, unknown>)?.email,
          plan_code: (txData.plan as Record<string, unknown>)?.plan_code,
        });
        break;

      case 'subscription.disable':
        await this.supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('paystack_subscription_code', txData.subscription_code);
        break;

      default:
        logger.info({ eventType }, 'Unhandled Paystack webhook event');
    }
  }
}
