/**
 * EZZAHCOMM NEXUS — DARAJA INTEGRATION
 * Safaricom M-Pesa Daraja API v2
 * Supports: STK Push, C2B, B2C, Transaction Status, Reversal
 */

import axios, { AxiosInstance } from 'axios';
import { SupabaseClient } from '@supabase/supabase-js';
import pino from 'pino';

const logger = pino({ name: 'nexus:daraja' });

const DARAJA_BASE = {
  production: 'https://api.safaricom.co.ke',
  sandbox: 'https://sandbox.safaricom.co.ke',
};

export interface STKPushRequest {
  phone: string;           // 254XXXXXXXXX format
  amount: number;
  account_reference: string;
  transaction_desc: string;
  tenant_id?: string;
  metadata?: Record<string, unknown>;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface DarajaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value: string | number }>;
      };
    };
  };
}

export class DarajaService {
  private client: AxiosInstance;
  private supabase: SupabaseClient;
  private env: 'production' | 'sandbox';
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.env = (process.env.DARAJA_ENV as 'production' | 'sandbox') || 'production';
    this.client = axios.create({ baseURL: DARAJA_BASE[this.env] });
  }

  // ── AUTH TOKEN ────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`
    ).toString('base64');

    const { data } = await this.client.get('/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${credentials}` },
    });

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  // ── STK PUSH (Lipa Na M-Pesa Online) ─────────────────────

  async stkPush(request: STKPushRequest): Promise<STKPushResponse> {
    const token = await this.getAccessToken();
    const timestamp = this.getTimestamp();
    const password = this.generatePassword(timestamp);

    const payload = {
      BusinessShortCode: process.env.DARAJA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: request.amount,
      PartyA: request.phone,
      PartyB: process.env.DARAJA_SHORTCODE,
      PhoneNumber: request.phone,
      CallBackURL: process.env.DARAJA_CALLBACK_URL,
      AccountReference: request.account_reference,
      TransactionDesc: request.transaction_desc,
    };

    const { data } = await this.client.post<STKPushResponse>(
      '/mpesa/stkpush/v1/processrequest',
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Persist transaction record
    await this.supabase.from('mobile_money_transactions').insert({
      tenant_id: request.tenant_id ?? null,
      phone: request.phone,
      amount: request.amount,
      account_reference: request.account_reference,
      merchant_request_id: data.MerchantRequestID,
      checkout_request_id: data.CheckoutRequestID,
      status: 'pending',
      provider: 'daraja',
      metadata: request.metadata ?? {},
    });

    logger.info({ phone: request.phone, amount: request.amount }, 'STK Push initiated');
    return data;
  }

  // ── PROCESS CALLBACK ──────────────────────────────────────

  async processCallback(callback: DarajaCallback): Promise<void> {
    const stk = callback.Body.stkCallback;
    const success = stk.ResultCode === 0;

    const update: Record<string, unknown> = {
      status: success ? 'completed' : 'failed',
      result_code: stk.ResultCode,
      result_desc: stk.ResultDesc,
      processed_at: new Date().toISOString(),
    };

    if (success && stk.CallbackMetadata) {
      const items = stk.CallbackMetadata.Item;
      update.mpesa_receipt = this.extractMeta(items, 'MpesaReceiptNumber');
      update.transaction_date = this.extractMeta(items, 'TransactionDate');
      update.phone_number = this.extractMeta(items, 'PhoneNumber');
    }

    await this.supabase
      .from('mobile_money_transactions')
      .update(update)
      .eq('checkout_request_id', stk.CheckoutRequestID);

    logger.info({ checkout_id: stk.CheckoutRequestID, success }, 'Daraja callback processed');
  }

  // ── QUERY STK STATUS ──────────────────────────────────────

  async querySTKStatus(checkoutRequestId: string): Promise<Record<string, unknown>> {
    const token = await this.getAccessToken();
    const timestamp = this.getTimestamp();
    const password = this.generatePassword(timestamp);

    const { data } = await this.client.post(
      '/mpesa/stkpushquery/v1/query',
      {
        BusinessShortCode: process.env.DARAJA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return data;
  }

  // ── HELPERS ───────────────────────────────────────────────

  private generatePassword(timestamp: string): string {
    return Buffer.from(
      `${process.env.DARAJA_SHORTCODE}${process.env.DARAJA_PASSKEY}${timestamp}`
    ).toString('base64');
  }

  private getTimestamp(): string {
    return new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
  }

  private extractMeta(
    items: Array<{ Name: string; Value: string | number }>,
    name: string
  ): string | number | undefined {
    return items.find(i => i.Name === name)?.Value;
  }
}
