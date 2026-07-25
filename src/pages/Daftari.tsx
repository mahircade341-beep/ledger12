import { useState } from 'react';
import { useLocalData } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';

interface DebtorRecord { _id: string; _creationTime: number; userId: string; name: string; phone?: string; amount: number; notes?: string; status: 'active' | 'cleared'; }

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

export default function Daftari() {
  const { userId } = useAuth();
  const { data: debtors, add, update } = useLocalData<DebtorRecord>('debtors');
  const { data: debtPayments, add: addPayment } = useLocalData('debtPayments');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});

  const addDebtor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !userId) return;
    add({ userId: userId as any, name: name.trim(), phone, amount, notes, status: 'active' } as any);
    setName(''); setPhone(''); setAmount(0); setNotes(''); setShowForm(false);
  };

  const handleRecordPayment = (debtor: DebtorRecord) => {
    const amtStr = paymentAmounts[debtor._id];
    const amt = Math.round(parseFloat(amtStr) * 100) / 100;
    if (!amt || amt <= 0) return;
    addPayment({ debtorId: debtor._id, amount: amt } as any);
    const newAmount = Math.max(0, Math.round((debtor.amount - amt) * 100) / 100);
    update(debtor._id, { amount: newAmount, status: newAmount <= 0 ? 'cleared' as const : 'active' as const } as any);
    setPaymentAmounts((prev) => ({ ...prev, [debtor._id]: '' }));
  };

  const handleClearAll = (debtor: DebtorRecord) => {
    if (debtor.amount <= 0) return;
    if (!confirm(`Clear all KES ${debtor.amount.toLocaleString()} owed by ${debtor.name}?`)) return;
    addPayment({ debtorId: debtor._id, amount: debtor.amount } as any);
    update(debtor._id, { amount: 0, status: 'cleared' as const });
  };

  const getPayments = (debtorId: string) =>
    debtPayments.filter((p: any) => p.debtorId === debtorId).sort((a: any, b: any) => b._creationTime - a._creationTime);

  const getTotalPaid = (debtorId: string) =>
    debtPayments.filter((p: any) => p.debtorId === debtorId).reduce((sum: number, p: any) => sum + p.amount, 0);

  const filtered = debtors.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || (d.phone || '').includes(search));
  const totalOutstanding = debtors.filter((d) => d.status === 'active').reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Daftari</h1><p className="page-subtitle">Manage debtors and track partial payments</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary self-start">{showForm ? 'Cancel' : '+ New Debtor'}</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card"><span className="stat-label">Active Debtors</span><span className="stat-value text-cyan-400">{debtors.filter((d) => d.status === 'active').length}</span></div>
        <div className="stat-card"><span className="stat-label">Cleared</span><span className="stat-value text-emerald-400">{debtors.filter((d) => d.status === 'cleared').length}</span></div>
        <div className="stat-card col-span-2"><span className="stat-label">Total Outstanding</span><span className="stat-value text-amber-400">KES {totalOutstanding.toLocaleString()}</span></div>
      </div>
      {showForm && (
        <div className="card border-cyan-500/20">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">New Debtor</h2>
          <form onSubmit={addDebtor} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Full name *" required />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="Phone number" />
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} className="input-field" placeholder="Amount owing *" required />
            <div className="flex gap-2"><input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field flex-1" placeholder="Notes" /><button type="submit" className="btn-primary">Add</button></div>
          </form>
        </div>
      )}
      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field max-w-md" placeholder="Search by name or phone..." />
      <div className="space-y-3">
        {filtered.map((debtor) => {
          const payments = getPayments(debtor._id);
          const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
          const totalOwed = totalPaid + debtor.amount;
          return (
          <div key={debtor._id} className={`card ${debtor.status === 'cleared' ? 'opacity-60' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[var(--text-primary)]">{debtor.name}</h3>
                  <span className={debtor.status === 'active' ? 'badge-amber' : 'badge-emerald'}>{debtor.status}</span>
                  <button onClick={() => setExpandedId(expandedId === debtor._id ? null : debtor._id)} className="btn-ghost p-1 text-[var(--text-muted)]">
                    <svg className={`w-4 h-4 transition-transform ${expandedId === debtor._id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                {debtor.phone && <p className="text-xs text-[var(--text-muted)] mt-0.5">{debtor.phone}</p>}
                {debtor.notes && <p className="text-xs text-[var(--text-muted)] mt-1">{debtor.notes}</p>}
                {payments.length > 0 && <p className="text-xs text-emerald-400 mt-1">KES {totalPaid.toLocaleString()} paid so far</p>}
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${debtor.status === 'active' ? 'text-amber-400' : 'text-emerald-400'}`}>KES {debtor.amount.toLocaleString()}</p>
                {totalOwed > debtor.amount && <p className="text-[10px] text-[var(--text-muted)]">of KES {totalOwed.toLocaleString()} total</p>}
              </div>
            </div>
            {debtor.status === 'active' && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="number" min={0} step="0.01" value={paymentAmounts[debtor._id] || ''} onChange={(e) => setPaymentAmounts((prev) => ({ ...prev, [debtor._id]: e.target.value }))} className="input-field max-w-[160px]" placeholder="Partial amount" />
                  <button onClick={() => handleRecordPayment(debtor)} className="btn-primary btn-sm" disabled={!paymentAmounts[debtor._id] || parseFloat(paymentAmounts[debtor._id] || '0') <= 0}>Record Payment</button>
                  <button onClick={() => handleClearAll(debtor)} className="btn-ghost text-xs text-red-400 hover:text-red-300">Clear All</button>
                </div>
              </div>
            )}
            {/* Payment History with Running Balance */}
            {expandedId === debtor._id && payments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Payment History ({payments.length})</p>
                <div className="max-h-52 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[var(--text-muted)] border-b border-slate-200/30 dark:border-slate-700/30">
                        <th className="text-left py-1.5 pr-2 font-medium">Date</th>
                        <th className="text-right py-1.5 px-2 font-medium">Payment</th>
                        <th className="text-right py-1.5 pl-2 font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments
                        .slice()
                        .sort((a: any, b: any) => a._creationTime - b._creationTime)
                        .map((p: any, _idx: number, arr: any[]) => {
                          const remaining = arr
                            .slice(_idx + 1)
                            .reduce((sum, next) => sum - next.amount, totalOwed);
                          return (
                            <tr key={p._id} className="border-b border-slate-200/20 dark:border-slate-800/20 last:border-0">
                              <td className="py-1.5 pr-2 text-[var(--text-secondary)]" title={new Date(p._creationTime).toLocaleDateString() + ' ' + fmtTime(p._creationTime)}>{fmtTimeRelative(p._creationTime)}</td>
                              <td className="py-1.5 px-2 text-right text-emerald-400 font-medium">-KES {p.amount.toLocaleString()}</td>
                              <td className="py-1.5 pl-2 text-right text-[var(--text-secondary)] font-medium">KES {remaining.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )})}
        {filtered.length === 0 && <div className="card text-center py-12"><svg className="w-12 h-12 mx-auto text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg><p className="text-[var(--text-muted)] text-sm mt-3">{search ? 'No debtors match your search' : 'No debtors yet. Add your first debtor!'}</p></div>}
      </div>
    </div>
  );
}
