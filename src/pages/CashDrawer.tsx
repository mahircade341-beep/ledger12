import { useState } from 'react';
import { useLocalData } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';

export default function CashDrawer() {
  const { userId } = useAuth();
  const { data: payouts, add } = useLocalData('payouts');

  const [type, setType] = useState<'drawdown' | 'restock' | 'expense'>('drawdown');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'drawdown' | 'restock' | 'expense'>('all');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !userId) return;
    setLoading(true);
    add({ userId: userId as any, type, category: category || (type === 'drawdown' ? 'Lunch/Chai' : type === 'restock' ? 'Supplier Restock' : 'General'), amount, notes } as any);
    setAmount(0); setNotes(''); setLoading(false);
  };

  const filtered = filter === 'all' ? payouts : payouts.filter((p: any) => p.type === filter);
  const totals = {
    drawdown: payouts.filter((p: any) => p.type === 'drawdown').reduce((s: number, p: any) => s + p.amount, 0),
    restock: payouts.filter((p: any) => p.type === 'restock').reduce((s: number, p: any) => s + p.amount, 0),
    expense: payouts.filter((p: any) => p.type === 'expense').reduce((s: number, p: any) => s + p.amount, 0),
  };
  const grandTotal = payouts.reduce((s: number, p: any) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="page-header"><div><h1 className="page-title">Cash Drawer</h1><p className="page-subtitle">Track payouts, restocks, and expenses</p></div></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card"><span className="stat-label">Drawdowns</span><span className="stat-value text-cyan-400">KES {totals.drawdown.toLocaleString()}</span></div>
        <div className="stat-card"><span className="stat-label">Restocks</span><span className="stat-value text-amber-400">KES {totals.restock.toLocaleString()}</span></div>
        <div className="stat-card"><span className="stat-label">Expenses</span><span className="stat-value text-red-400">KES {totals.expense.toLocaleString()}</span></div>
        <div className="stat-card"><span className="stat-label">Total Out</span><span className="stat-value text-slate-100">KES {grandTotal.toLocaleString()}</span></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Log New Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {([{ v: 'drawdown', l: 'Drawdown', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }, { v: 'restock', l: 'Restock', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> }, { v: 'expense', l: 'Expense', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> }] as const).map((opt) => (
                    <button key={opt.v} type="button" onClick={() => setType(opt.v)} className={`flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${type === opt.v ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-[var(--bg-surface2)] text-[var(--text-secondary)] border border-slate-300/30 dark:border-slate-700/30 hover:border-slate-400/50'}`}>{opt.icon} {opt.l}</button>
                  ))}
                </div>
              </div>
              <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="select-field">
                  <option value="">Select category...</option>
                  {type === 'drawdown' && <><option value="Lunch/Chai">Lunch/Chai</option><option value="Transport">Transport</option><option value="Personal">Personal</option><option value="Other">Other</option></>}
                  {type === 'restock' && <><option value="Supplier Restock">Supplier Restock</option><option value="Inventory Purchase">Inventory Purchase</option></>}
                  {type === 'expense' && <><option value="Utilities">Utilities</option><option value="Rent">Rent</option><option value="Maintenance">Maintenance</option><option value="Other">Other</option></>}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Amount (KES)</label><input type="number" min={0} value={amount} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} className="input-field" placeholder="0" required /></div>
              <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field min-h-[80px] resize-none" placeholder="Add details..." rows={2} /></div>
              <button type="submit" disabled={loading || amount <= 0} className="btn-primary w-full">{loading ? 'Saving...' : 'Log Entry'}</button>
            </form>
          </div>
          <div className="card mt-4">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-2">Ledger Summary</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[var(--text-secondary)]"><span><svg className="w-3.5 h-3.5 inline text-cyan-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Drawdowns</span><span className="text-cyan-400 font-medium">KES {totals.drawdown.toLocaleString()}</span></div>
              <div className="flex justify-between text-[var(--text-secondary)]"><span><svg className="w-3.5 h-3.5 inline text-amber-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> Restocks</span><span className="text-amber-400 font-medium">KES {totals.restock.toLocaleString()}</span></div>
              <div className="flex justify-between text-[var(--text-secondary)]"><span><svg className="w-3.5 h-3.5 inline text-red-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> Expenses</span><span className="text-red-400 font-medium">KES {totals.expense.toLocaleString()}</span></div>
              <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5 flex justify-between text-[var(--text-primary)] font-semibold"><span>Grand Total</span><span>KES {grandTotal.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3">
          <div className="card">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-[var(--text-primary)]">Ledger Feed</h2>
              <div className="flex gap-1">{(['all', 'drawdown', 'restock', 'expense'] as const).map((f) => (<button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all duration-200 ${filter === f ? 'bg-cyan-500/10 text-cyan-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>{f}</button>))}</div>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
              {filtered.map((p: any) => (
                <div key={p._id} className="flex items-start gap-3 p-3 bg-[var(--bg-surface2)] rounded-lg hover:bg-[var(--bg-surface2)]/80 transition-colors">
                  <span className="mt-0.5 shrink-0">{p.type === 'drawdown' ? <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> : p.type === 'restock' ? <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> : <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between"><span className="text-sm font-medium text-[var(--text-primary)] capitalize">{p.category}</span><span className={`text-sm font-bold ${p.type === 'drawdown' ? 'text-cyan-400' : p.type === 'restock' ? 'text-amber-400' : 'text-red-400'}`}>-KES {p.amount.toLocaleString()}</span></div>
                    {p.notes && <p className="text-xs text-[var(--text-muted)] mt-0.5">{p.notes}</p>}
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{new Date(p._creationTime).toLocaleString()}</p>
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
