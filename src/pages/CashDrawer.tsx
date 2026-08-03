import { useState } from 'react';
import { useLocalData } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';

export default function CashDrawer() {
  const { userId } = useAuth();
  const { data: payouts, add } = useLocalData('payouts');

  const [type, setType] = useState<'drawdown' | 'restock' | 'expense'>('drawdown');
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'drawdown' | 'restock' | 'expense'>('all');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !userId) return;
    setLoading(true);
    add({ userId: userId as any, type, amount, notes } as any);
    setAmount(0); setNotes(''); setLoading(false);
  };

  const filtered = filter === 'all' ? payouts : payouts.filter((p: any) => p.type === filter);
  const totals = {
    drawdown: payouts.filter((p: any) => p.type === 'drawdown').reduce((s: number, p: any) => s + p.amount, 0),
    restock: payouts.filter((p: any) => p.type === 'restock').reduce((s: number, p: any) => s + p.amount, 0),
    expense: payouts.filter((p: any) => p.type === 'expense').reduce((s: number, p: any) => s + p.amount, 0),
  };
  const grandTotal = payouts.reduce((s: number, p: any) => s + p.amount, 0);

  function fmtTime(ts: number) {
    const pref = localStorage.getItem('dl-time-format') || '12h';
    if (pref === '24h') return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function fmtTimeRelative(ts: number) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    return new Date(ts).toLocaleDateString();
  }

  return (
    <div className="space-y-6">
      {/* V10 header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Cash Drawer</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Track payouts, restocks, and expenses</p>
        </div>
      </div>

      {/* V10 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-v2"><span className="stat-label-v2">Drawdowns</span><span className="stat-value-v2 text-[var(--color-info)]">KES {totals.drawdown.toLocaleString()}</span></div>
        <div className="stat-v2"><span className="stat-label-v2">Restocks</span><span className="stat-value-v2 text-[var(--color-warning)]">KES {totals.restock.toLocaleString()}</span></div>
        <div className="stat-v2"><span className="stat-label-v2">Expenses</span><span className="stat-value-v2 text-[var(--color-danger)]">KES {totals.expense.toLocaleString()}</span></div>
        <div className="stat-v2 stat-v2-accent"><span className="stat-label-v2">Total Out</span><span className="stat-value-v2 text-[var(--text-primary)]">KES {grandTotal.toLocaleString()}</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* V10 Log New Entry card */}
          <div className="card-v2">
            <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 to-cyan-500/30 rounded-t-xl -mt-[1px] mx-auto" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Log New Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {([{ v: 'drawdown', l: 'Drawdown', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }, { v: 'restock', l: 'Restock', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> }, { v: 'expense', l: 'Expense', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> }] as const).map((opt) => (
                    <button key={opt.v} type="button" onClick={() => setType(opt.v)} className={`tab-v2 justify-center ${type === opt.v ? 'tab-v2-active' : ''}`}>{opt.icon} {opt.l}</button>
                  ))}
                </div>
              </div>
              <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Amount (KES)</label><input type="number" min={0} value={amount} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} className="input-v2 w-full" placeholder="0" required /></div>
              <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-v2 w-full min-h-[80px] resize-none" placeholder="Add details..." rows={2} /></div>
              <button type="submit" disabled={loading || amount <= 0} className="btn-v2-primary w-full">{loading ? 'Saving...' : 'Log Entry'}</button>
            </form>
          </div>

          {/* V10 Ledger Summary card */}
          <div className="card-v2">
            <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 to-cyan-500/30 rounded-t-xl -mt-[1px] mx-auto" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Ledger Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-[var(--bg-surface2)] rounded-xl"><span className="text-[var(--text-secondary)] flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[var(--color-info)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Drawdowns</span><span className="text-[var(--color-info)] font-semibold">KES {totals.drawdown.toLocaleString()}</span></div>
              <div className="flex justify-between p-2.5 bg-[var(--bg-surface2)] rounded-xl"><span className="text-[var(--text-secondary)] flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[var(--color-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> Restocks</span><span className="text-[var(--color-warning)] font-semibold">KES {totals.restock.toLocaleString()}</span></div>
              <div className="flex justify-between p-2.5 bg-[var(--bg-surface2)] rounded-xl"><span className="text-[var(--text-secondary)] flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> Expenses</span><span className="text-[var(--color-danger)] font-semibold">KES {totals.expense.toLocaleString()}</span></div>
              <div className="divider-v2 !my-0" />
              <div className="flex justify-between p-2.5 bg-gradient-to-r from-[var(--accent-dim)] to-transparent rounded-xl">
                <span className="text-[var(--text-primary)] font-semibold">Grand Total</span><span className="text-[var(--text-primary)] font-bold">KES {grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* V10 Ledger Feed card */}
        <div className="lg:col-span-3">
          <div className="card-v2">
            <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 to-cyan-500/30 rounded-t-xl -mt-[1px] mx-auto" />
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-[var(--text-primary)]">Ledger Feed</h2>
              <div className="flex gap-1 bg-[var(--bg-surface2)] rounded-lg p-1">{(['all', 'drawdown', 'restock', 'expense'] as const).map((f) => (<button key={f} onClick={() => setFilter(f)} className={`tab-v2 !px-2 ${filter === f ? 'tab-v2-active' : ''} capitalize`}>{f}</button>))}</div>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
              {filtered.map((p: any) => (
                <div key={p._id} className="flex items-start gap-3 p-3 bg-[var(--bg-surface2)] rounded-xl hover:bg-[var(--bg-surface2)]/80 transition-colors">
                  <span className="mt-0.5 shrink-0">{p.type === 'drawdown' ? <svg className="w-5 h-5 text-[var(--color-info)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> : p.type === 'restock' ? <svg className="w-5 h-5 text-[var(--color-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> : <svg className="w-5 h-5 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between"><span className="text-sm font-medium text-[var(--text-primary)] capitalize">{p.category}</span><span className={`text-sm font-bold ${p.type === 'drawdown' ? 'text-[var(--color-info)]' : p.type === 'restock' ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>-KES {p.amount.toLocaleString()}</span></div>
                    {p.notes && <p className="text-xs text-[var(--text-muted)] mt-0.5">{p.notes}</p>}
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5" title={new Date(p._creationTime).toLocaleDateString() + ' ' + fmtTime(p._creationTime)}>{fmtTimeRelative(p._creationTime)}</p>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="text-center py-12"><svg className="w-12 h-12 mx-auto text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><p className="text-[var(--text-muted)] text-sm mt-3">No entries yet</p></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
