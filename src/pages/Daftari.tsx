import { useState } from 'react';
import { useLocalData } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';

interface DebtorRecord { _id: string; _creationTime: number; userId: string; name: string; phone?: string; amount: number; notes?: string; status: 'active' | 'cleared'; }

export default function Daftari() {
  const { userId } = useAuth();
  const { data: debtors, add, update } = useLocalData<DebtorRecord>('debtors');
  const { add: addPayment } = useLocalData('debtPayments');

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
    const amt = parseFloat(amtStr);
    if (!amt || amt <= 0) return;
    addPayment({ debtorId: debtor._id, amount: amt } as any);
    const newAmount = Math.max(0, debtor.amount - amt);
    update(debtor._id, { amount: newAmount, status: newAmount <= 0 ? 'cleared' as const : 'active' as const } as any);
    setPaymentAmounts((prev) => ({ ...prev, [debtor._id]: '' }));
  };

  const filtered = debtors.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || (d.phone || '').includes(search));
  const totalOutstanding = debtors.filter((d) => d.status === 'active').reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Daftari</h1><p className="page-subtitle">Manage debtors and track payments</p></div>
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
        {filtered.map((debtor) => (
          <div key={debtor._id} className={`card ${debtor.status === 'cleared' ? 'opacity-60' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2"><h3 className="font-semibold text-[var(--text-primary)]">{debtor.name}</h3><span className={debtor.status === 'active' ? 'badge-amber' : 'badge-emerald'}>{debtor.status}</span></div>
                {debtor.phone && <p className="text-xs text-[var(--text-muted)] mt-0.5">{debtor.phone}</p>}
                {debtor.notes && <p className="text-xs text-[var(--text-muted)] mt-1">{debtor.notes}</p>}
              </div>
              <div className="text-right"><p className="text-xl font-bold text-amber-400">KES {debtor.amount.toLocaleString()}</p></div>
            </div>
            {debtor.status === 'active' && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <input type="number" min={0} value={paymentAmounts[debtor._id] || ''} onChange={(e) => setPaymentAmounts((prev) => ({ ...prev, [debtor._id]: e.target.value }))} className="input-field max-w-[180px]" placeholder="Payment amount" />
                  <button onClick={() => handleRecordPayment(debtor)} className="btn-primary btn-sm">Record Payment</button>
                  <button onClick={() => update(debtor._id, { amount: 0, status: 'cleared' } as any)} className="btn-ghost text-xs">Clear All</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="card text-center py-12"><span className="text-4xl">📋</span><p className="text-[var(--text-muted)] text-sm mt-3">{search ? 'No debtors match your search' : 'No debtors yet. Add your first debtor!'}</p></div>}
      </div>
    </div>
  );
}
