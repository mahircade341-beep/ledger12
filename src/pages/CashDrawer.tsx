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
                  {([{ v: 'drawdown', l: '💰 Drawdown' }, { v: 'restock', l: '📦 Restock' }, { v: 'expense', l: '📄 Expense' }] as const).map((opt) => (
                    <button key={opt.v} type="button" onClick={() => setType(opt.v)} className={`py-2 rounded-lg text-sm font-medium transition-all duration-200 ${type === opt.v ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-[var(--bg-surface2)] text-[var(--text-secondary)] border border-slate-300/30 dark:border-slate-700/30 hover:border-slate-400/50'}`}>{opt.l}</button>
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
              <div className="flex justify-between text-[var(--text-secondary)]"><span>💰 Total Drawdowns</span><span className="text-cyan-400 font-medium">KES {totals.drawdown.toLocaleString()}</span></div>
              <div className="flex justify-between text-[var(--text-secondary)]"><span>📦 Total Restocks</span><span className="text-amber-400 font-medium">KES {totals.restock.toLocaleString()}</span></div>
              <div className="flex justify-between text-[var(--text-secondary)]"><span>📄 Total Expenses</span><span className="text-red-400 font-medium">KES {totals.expense.toLocaleString()}</span></div>
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
                  <span className="text-lg mt-0.5">{p.type === 'drawdown' ? '💰' : p.type === 'restock' ? '📦' : '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between"><span className="text-sm font-medium text-[var(--text-primary)] capitalize">{p.category}</span><span className={`text-sm font-bold ${p.type === 'drawdown' ? 'text-cyan-400' : p.type === 'restock' ? 'text-amber-400' : 'text-red-400'}`}>-KES {p.amount.toLocaleString()}</span></div>
                    {p.notes && <p className="text-xs text-[var(--text-muted)] mt-0.5">{p.notes}</p>}
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{new Date(p._creationTime).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="text-center py-12"><span className="text-4xl">💰</span><p className="text-[var(--text-muted)] text-sm mt-3">No entries yet</p></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
