import { useState, useMemo, useCallback } from 'react';
import { useLocalData } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';

type ViewPeriod = 'daily' | 'weekly' | 'monthly';

export default function Insights() {
  const { userId } = useAuth();
  const { data: transactions } = useLocalData('transactions');
  const { data: products } = useLocalData('products');
  const { data: payouts } = useLocalData('payouts');
  const [period, setPeriod] = useState<ViewPeriod>('daily');

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    if (period === 'daily') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === 'weekly') { const day = now.getDay(); start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0); }
    else start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  };

  const { start, end } = getDateRange();

  const filteredTransactions = useMemo(() => transactions.filter((t: any) => t._creationTime >= start.getTime() && t._creationTime <= end.getTime()), [transactions, start, end]);
  const filteredPayouts = useMemo(() => payouts.filter((p: any) => p._creationTime >= start.getTime() && p._creationTime <= end.getTime()), [payouts, start, end]);

  const grossSales = filteredTransactions.reduce((sum: number, t: any) => sum + t.total, 0);
  const totalDiscounts = filteredTransactions.reduce((sum: number, t: any) => sum + (t.discount || 0), 0);
  const totalPayoutsAmt = filteredPayouts.reduce((sum: number, p: any) => sum + p.amount, 0);
  const numTransactions = filteredTransactions.length;
  const avgTicket = numTransactions > 0 ? grossSales / numTransactions : 0;

  // #5: Profit calculation
  const profitData = useMemo(() => {
    let totalProfit = 0;
    let totalCost = 0;
    filteredTransactions.forEach((tx: any) => {
      (tx.items || []).forEach((item: any) => {
        // Find product by ID or name to get wholesale price
        const product = products.find((p: any) => p._id === item.productId || p.name === item.name);
        const wholesale = product?.wholesalePrice || item.wholesalePrice || 0;
        const cost = wholesale * item.quantity;
        totalCost += cost;
        totalProfit += item.subtotal - cost;
      });
    });
    return { totalProfit, totalCost, margin: grossSales > 0 ? (totalProfit / grossSales) * 100 : 0 };
  }, [filteredTransactions, products, grossSales]);

  const cashTransactions = filteredTransactions.filter((t: any) => t.paymentMethod === 'cash');
  const mpesaTransactions = filteredTransactions.filter((t: any) => t.paymentMethod === 'mpesa');
  const debtTransactions = filteredTransactions.filter((t: any) => t.paymentMethod === 'debt');

  const expectedCash = cashTransactions.reduce((sum: number, t: any) => sum + t.total, 0);
  const mpesaTotal = mpesaTransactions.reduce((sum: number, t: any) => sum + t.total, 0);
  const debtTotal = debtTransactions.reduce((sum: number, t: any) => sum + t.total, 0);

  const exportCSV = useCallback(() => {
    if (filteredTransactions.length === 0) { alert('No transactions to export'); return; }
    const header = 'Date,Time,Items,Payment Method,Discount,Total,Profit\n';
    const rows = filteredTransactions.map((t: any) => {
      let txProfit = 0;
      (t.items || []).forEach((item: any) => {
        const product = products.find((p: any) => p._id === item.productId || p.name === item.name);
        const wholesale = product?.wholesalePrice || item.wholesalePrice || 0;
        txProfit += item.subtotal - (wholesale * item.quantity);
      });
      return `${new Date(t._creationTime).toLocaleDateString()},${new Date(t._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},${t.items.length},${t.paymentMethod},${t.discount},${t.total},${txProfit}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `dukaledger-sales-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [filteredTransactions, products, period]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Insights</h1><p className="page-subtitle">Sales analytics, profit & anti-theft auditing</p></div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-[var(--bg-surface2)] rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all duration-200 ${period === p ? 'bg-cyan-500/10 text-cyan-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>{p}</button>
            ))}
          </div>
          <button onClick={exportCSV} className="btn-secondary btn-sm"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Export CSV</button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="stat-card"><span className="stat-label">Gross Sales</span><span className="stat-value text-emerald-400">KES {grossSales.toLocaleString()}</span><span className="text-xs text-[var(--text-muted)]">{numTransactions} txns</span></div>
        <div className="stat-card"><span className="stat-label">Avg. Ticket</span><span className="stat-value text-cyan-400">KES {avgTicket.toLocaleString()}</span></div>
        <div className="stat-card"><span className="stat-label">Profit</span><span className={`stat-value ${profitData.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>KES {profitData.totalProfit.toLocaleString()}</span><span className="text-xs text-[var(--text-muted)]">{profitData.margin.toFixed(1)}% margin</span></div>
        <div className="stat-card"><span className="stat-label">Cost of Goods</span><span className="stat-value text-amber-400">KES {profitData.totalCost.toLocaleString()}</span></div>
        <div className="stat-card"><span className="stat-label">Discounts</span><span className="stat-value text-amber-400">KES {totalDiscounts.toLocaleString()}</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Payment Breakdown</h2>
          <div className="space-y-3">
            {[{ label: '💵 Cash', amount: expectedCash, count: cashTransactions.length, color: 'text-emerald-400' },
              { label: '📱 M-Pesa', amount: mpesaTotal, count: mpesaTransactions.length, color: 'text-cyan-400' },
              { label: '📋 Debt', amount: debtTotal, count: debtTransactions.length, color: 'text-amber-400' },
            ].map(({ label, amount, count, color }) => (
              <div key={label} className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg">
                <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                <div className="text-right"><span className={`text-sm font-semibold ${color}`}>KES {amount.toLocaleString()}</span><span className="text-xs text-[var(--text-muted)] ml-2">({count} txns)</span></div>
              </div>
            ))}
            <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Total</span><span className="text-sm font-bold text-cyan-400">KES {grossSales.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Profit Breakdown */}
        <div className="card border-emerald-500/20">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-[var(--text-primary)]">💰 Profit Analysis</h2><span className="badge-emerald">{profitData.margin.toFixed(1)}% Margin</span></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><span className="text-sm text-[var(--text-secondary)]">Gross Sales</span><span className="text-sm font-bold text-emerald-400">KES {grossSales.toLocaleString()}</span></div>
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><span className="text-sm text-[var(--text-secondary)]">Cost of Goods Sold</span><span className="text-sm font-bold text-amber-400">-KES {profitData.totalCost.toLocaleString()}</span></div>
            <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-500/5 to-transparent rounded-lg">
                <div><span className="text-sm font-semibold text-[var(--text-primary)]">Net Profit</span><p className="text-xs text-[var(--text-muted)] mt-0.5">After wholesale costs</p></div>
                <span className={`text-lg font-bold ${profitData.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  KES {profitData.totalProfit.toLocaleString()}
                </span>
              </div>
            </div>
            {profitData.totalProfit < 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2"><span className="text-lg mt-0.5">⚠️</span><div><p className="text-sm font-medium text-red-400">Negative Profit</p><p className="text-xs text-red-400/70 mt-0.5">Wholesale costs exceed sales. Review your pricing.</p></div></div>
            )}
          </div>
        </div>

        <div className="card border-amber-500/20">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-[var(--text-primary)]">🛡️ Anti-Theft Cash Auditor</h2><span className="badge-amber">Audit</span></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><span className="text-sm text-[var(--text-secondary)]">Expected Cash in Drawer</span><span className="text-sm font-bold text-emerald-400">KES {expectedCash.toLocaleString()}</span></div>
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><span className="text-sm text-[var(--text-secondary)]">M-Pesa Collected</span><span className="text-sm font-bold text-cyan-400">KES {mpesaTotal.toLocaleString()}</span></div>
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><span className="text-sm text-[var(--text-secondary)]">Outstanding Debt</span><span className="text-sm font-bold text-amber-400">KES {debtTotal.toLocaleString()}</span></div>
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><span className="text-sm text-[var(--text-secondary)]">Cash Out (Payouts)</span><span className="text-sm font-bold text-red-400">-KES {totalPayoutsAmt.toLocaleString()}</span></div>
            <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3"><div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><div><span className="text-sm font-semibold text-[var(--text-primary)]">Net Cash Position</span><p className="text-xs text-[var(--text-muted)] mt-0.5">Expected cash − Payouts</p></div><span className={`text-lg font-bold ${expectedCash - totalPayoutsAmt >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>KES {(expectedCash - totalPayoutsAmt).toLocaleString()}</span></div></div>
            {expectedCash - totalPayoutsAmt < 0 ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2"><span className="text-lg mt-0.5">⚠️</span><div><p className="text-sm font-medium text-red-400">Discrepancy Detected</p><p className="text-xs text-red-400/70 mt-0.5">Payouts exceed expected cash. Review entries.</p></div></div>
            ) : numTransactions > 0 && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2"><span className="text-lg mt-0.5">✅</span><div><p className="text-sm font-medium text-emerald-400">All Clear</p><p className="text-xs text-emerald-400/70 mt-0.5">No discrepancies detected.</p></div></div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Recent Transactions ({numTransactions})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[var(--text-muted)] border-b border-slate-200/60 dark:border-slate-800/60">
              <th className="text-left py-2 pr-2">Date</th><th className="text-right py-2 px-2">Items</th><th className="text-right py-2 px-2">Payment</th><th className="text-right py-2 px-2">Discount</th><th className="text-right py-2 px-2">Profit</th><th className="text-right py-2 pl-2">Total</th>
            </tr></thead>
            <tbody>
              {filteredTransactions.slice(0, 20).map((t: any) => {
                let txProfit = 0;
                (t.items || []).forEach((item: any) => {
                  const product = products.find((p: any) => p._id === item.productId || p.name === item.name);
                  const wholesale = product?.wholesalePrice || item.wholesalePrice || 0;
                  txProfit += item.subtotal - (wholesale * item.quantity);
                });
                return (
                  <tr key={t._id} className="border-b border-slate-200/30 dark:border-slate-800/30 hover:bg-[var(--bg-surface2)]/50 transition-colors">
                    <td className="py-2 pr-2 text-[var(--text-muted)] text-xs">{new Date(t._creationTime).toLocaleDateString()} {new Date(t._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-2 px-2 text-right text-[var(--text-secondary)]">{t.items.length}</td>
                    <td className="py-2 px-2 text-right capitalize"><span className={`badge ${t.paymentMethod === 'cash' ? 'badge-emerald' : t.paymentMethod === 'mpesa' ? 'badge-cyan' : 'badge-amber'}`}>{t.paymentMethod}</span></td>
                    <td className="py-2 px-2 text-right text-amber-400">{t.discount > 0 ? `KES ${t.discount.toLocaleString()}` : '—'}</td>
                    <td className={`py-2 px-2 text-right ${txProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>KES {txProfit.toLocaleString()}</td>
                    <td className="py-2 pl-2 text-right text-cyan-400 font-medium">KES {t.total.toLocaleString()}</td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-[var(--text-muted)] text-sm">No transactions in this period</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
