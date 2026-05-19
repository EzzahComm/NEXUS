import { createClient } from '@supabase/supabase-js';
import { DarajaService } from '../integrations/payments/daraja';

async function extractResultCode(data: any): Promise<string | number | undefined> {
  if (!data) return undefined;
  if (data.Result && data.Result.ResultCode !== undefined) return data.Result.ResultCode;
  if (data.Body?.stkCallback?.ResultCode !== undefined) return data.Body.stkCallback.ResultCode;
  if (data.resultCode !== undefined) return data.resultCode;
  if (data.ResultCode !== undefined) return data.ResultCode;
  if (data.ResponseCode !== undefined) return data.ResponseCode;
  if (data.responseCode !== undefined) return data.responseCode;
  return undefined;
}

export async function runPoller(): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const daraja = new DarajaService(supabase as any);

  const cutoff = new Date(Date.now() - 60 * 1000).toISOString(); // older than 60s

  const { data: rows, error } = await supabase
    .from('mobile_money_transactions')
    .select('id, checkout_request_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .limit(50);

  if (error) {
    console.error('Failed to fetch pending MPESA transactions', error);
    return;
  }
  if (!rows || rows.length === 0) {
    console.log('No stale pending MPESA transactions found');
    return;
  }

  for (const r of rows as any[]) {
    const checkout = r.checkout_request_id;
    if (!checkout) continue;
    try {
      const statusRes = await daraja.querySTKStatus(checkout);
      const code = await extractResultCode(statusRes);
      // 1032 = request in process (Daraja)
      if (code === undefined || String(code) === '1032') {
        continue;
      }

      const newStatus = String(code) === '0' ? 'completed' : 'failed';

      await supabase
        .from('mobile_money_transactions')
        .update({ status: newStatus, raw_response: statusRes, completed_at: new Date().toISOString() })
        .eq('checkout_request_id', checkout);

      // Update payments table if present
      await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('mpesa_checkout_request_id', checkout)
        .eq('status', 'pending');

      console.log(`Resolved checkout ${checkout} -> ${newStatus} (code=${code})`);
    } catch (err) {
      console.error('Error querying STK status for', checkout, err);
    }
  }
}

if (require.main === module) {
  runPoller().catch((err) => {
    console.error('MPESA poller failed', err);
    process.exit(1);
  });
}
