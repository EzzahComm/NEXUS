import { createAdminClient } from '@/lib/supabase/admin-client';

const statusBadge: Record<string, string> = {
  completed: 'bg-[#00ff88]/10 text-[#00ff88]',
  success:   'bg-[#00ff88]/10 text-[#00ff88]',
  pending:   'bg-[#f59e0b]/10 text-[#f59e0b]',
  failed:    'bg-red-500/10 text-red-400',
  cancelled: 'bg-white/8 text-white/30',
  abandoned: 'bg-white/8 text-white/30',
};

export default async function AdminTransactionsPage() {
  const db = createAdminClient();
  const [{ data: mpesa }, { data: card }] = await Promise.all([
    db.from('mobile_money_transactions').select('*').order('created_at', { ascending: false }).limit(100),
    db.from('card_transactions').select('*').order('created_at', { ascending: false }).limit(100),
  ]);

  const all = [
    ...(mpesa ?? []).map(r => ({ ...r, provider: 'M-Pesa', ref: r.mpesa_receipt_number ?? r.checkout_request_id })),
    ...(card ?? []).map(r => ({ ...r, provider: 'Card', ref: r.reference })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalKES = all.filter(r => ['completed','success'].includes(r.status))
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-white/40 text-sm mt-1">{all.length} transactions · KES {totalKES.toLocaleString()} collected</p>
        </div>
      </div>

      {!all.length ? (
        <p className="text-white/30 text-sm">No transactions yet.</p>
      ) : (
        <div className="border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Reference</th>
                <th className="text-left px-5 py-3 font-medium">Provider</th>
                <th className="text-left px-5 py-3 font-medium">Phone / Email</th>
                <th className="text-right px-5 py-3 font-medium">Amount</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {all.map((r, i) => (
                <tr key={r.id} className={`border-b border-white/5 hover:bg-white/3 ${i === all.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-5 py-3.5 font-mono text-xs text-white/50 truncate max-w-[140px]">{r.ref ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold ${r.provider === 'M-Pesa' ? 'text-[#00cc6a]' : 'text-[#0066ff]'}`}>{r.provider}</span>
                  </td>
                  <td className="px-5 py-3.5 text-white/40 text-xs">{r.phone ?? (r as {email?:string}).email ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right text-white font-medium">KES {Number(r.amount).toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge[r.status] ?? 'bg-white/8 text-white/50'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />{r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-white/30 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
