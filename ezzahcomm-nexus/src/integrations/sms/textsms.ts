/**
 * EZZAHCOMM NEXUS — BULK SMS INTEGRATION
 * Provider: EZZAHCOMM Bulk SMS (sms.textsms.co.ke)
 * Core communication infrastructure for NEXUS platform.
 * Supports: bulk campaigns, OTP, transactional, marketing SMS.
 */

import axios, { AxiosInstance } from 'axios';
import { SupabaseClient } from '@supabase/supabase-js';
import pino from 'pino';

const logger = pino({ name: 'nexus:sms' });

export interface SMSMessage {
  to: string | string[];     // single number or array for bulk
  message: string;
  sender_id?: string;
  campaign_id?: string;
  tenant_id?: string;
  metadata?: Record<string, unknown>;
}

export interface SMSCampaign {
  name: string;
  message: string;
  recipients: string[];
  scheduled_at?: string;
  tenant_id?: string;
  project_id?: string;
}

export interface SMSDeliveryReport {
  message_id: string;
  phone: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  timestamp: string;
}

export class TextSMSService {
  private client: AxiosInstance;
  private supabase: SupabaseClient;
  private partnerId: string;
  private apiKey: string;
  private senderId: string;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.partnerId = process.env.TEXTSMS_PARTNER_ID!;
    this.apiKey = process.env.TEXTSMS_API_KEY!;
    this.senderId = process.env.TEXTSMS_SENDER_ID || 'EZZAHCOMM';

    this.client = axios.create({
      baseURL: process.env.TEXTSMS_BASE_URL || 'https://sms.textsms.co.ke/api/services/sendsms/',
      timeout: 30000,
    });
  }

  // ── SEND SINGLE SMS ───────────────────────────────────────

  async send(msg: SMSMessage): Promise<{ success: boolean; message_id?: string }> {
    const to = Array.isArray(msg.to) ? msg.to[0] : msg.to;

    try {
      const { data } = await this.client.post('', {
        partnerID: this.partnerId,
        apikey: this.apiKey,
        pass_type: 'plain',
        clientsmsid: Date.now(),
        mobile: this.normalizePhone(to),
        message: msg.message,
        shortcode: msg.sender_id || this.senderId,
      });

      const success = data.responses?.[0]?.['response-code'] === 200;
      const messageId = data.responses?.[0]?.['messageid'];

      await this.logSMS({
        tenant_id: msg.tenant_id,
        phone: to,
        message: msg.message,
        status: success ? 'sent' : 'failed',
        message_id: messageId,
        campaign_id: msg.campaign_id,
        metadata: msg.metadata,
      });

      logger.info({ phone: to, success }, 'SMS sent');
      return { success, message_id: messageId };
    } catch (err) {
      logger.error({ err, phone: to }, 'SMS send failed');
      await this.logSMS({
        tenant_id: msg.tenant_id,
        phone: to,
        message: msg.message,
        status: 'failed',
        metadata: { error: String(err) },
      });
      return { success: false };
    }
  }

  // ── BULK SEND ─────────────────────────────────────────────

  async sendBulk(msg: SMSMessage): Promise<{ sent: number; failed: number }> {
    const numbers = Array.isArray(msg.to) ? msg.to : [msg.to];
    let sent = 0;
    let failed = 0;

    // Process in batches of 100
    const batches = this.chunk(numbers, 100);

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(phone => this.send({ ...msg, to: phone }))
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) sent++;
        else failed++;
      }

      // Throttle between batches
      if (batches.length > 1) await this.sleep(500);
    }

    logger.info({ total: numbers.length, sent, failed }, 'Bulk SMS complete');
    return { sent, failed };
  }

  // ── SEND CAMPAIGN ─────────────────────────────────────────

  async sendCampaign(campaign: SMSCampaign): Promise<string> {
    const { data, error } = await this.supabase
      .from('sms_campaigns')
      .insert({
        name: campaign.name,
        message: campaign.message,
        recipient_count: campaign.recipients.length,
        tenant_id: campaign.tenant_id ?? null,
        project_id: campaign.project_id ?? null,
        status: 'running',
        scheduled_at: campaign.scheduled_at ?? null,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Campaign creation failed: ${error.message}`);
    const campaignId = data.id;

    const result = await this.sendBulk({
      to: campaign.recipients,
      message: campaign.message,
      campaign_id: campaignId,
      tenant_id: campaign.tenant_id,
    });

    await this.supabase
      .from('sms_campaigns')
      .update({
        status: 'completed',
        sent_count: result.sent,
        failed_count: result.failed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    logger.info({ campaignId, ...result }, 'Campaign completed');
    return campaignId;
  }

  // ── SEND OTP ──────────────────────────────────────────────

  async sendOTP(phone: string, otp: string, tenantId?: string): Promise<boolean> {
    const result = await this.send({
      to: phone,
      message: `Your EZZAHCOMM verification code is: ${otp}. Valid for 10 minutes. Do not share.`,
      sender_id: this.senderId,
      tenant_id: tenantId,
    });
    return result.success;
  }

  // ── PAYMENT CONFIRMATION ──────────────────────────────────

  async sendPaymentConfirmation(
    phone: string,
    amount: number,
    reference: string,
    tenantId?: string
  ): Promise<void> {
    await this.send({
      to: phone,
      message: `Payment of KES ${amount.toLocaleString()} received. Ref: ${reference}. Thank you for your business. - EZZAHCOMM`,
      tenant_id: tenantId,
    });
  }

  // ── LOG SMS ───────────────────────────────────────────────

  private async logSMS(record: {
    tenant_id?: string;
    phone: string;
    message: string;
    status: string;
    message_id?: string;
    campaign_id?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.supabase.from('sms_logs').insert({
      tenant_id: record.tenant_id ?? null,
      phone: record.phone,
      message: record.message,
      status: record.status,
      message_id: record.message_id ?? null,
      campaign_id: record.campaign_id ?? null,
      provider: 'ezzahcomm-sms',
      metadata: record.metadata ?? {},
    });
  }

  // ── HELPERS ───────────────────────────────────────────────

  private normalizePhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) return '254' + clean.slice(1);
    if (clean.startsWith('7') || clean.startsWith('1')) return '254' + clean;
    return clean;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
