import { useState, useMemo, useCallback } from 'react';
import { useLocalData } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';

type ViewPeriod = 'daily' | 'weekly' | 'monthly';

function fmtTime(ts: number) {
  const pref = localStorage.getItem('dl-time-format') || '12h';
  if (pref === '24h') {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtTimeRelative(ts: number) {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(ts).toLocaleDateString();
}

export default function Insights() {
  const { userId } = useAuth();
  const { data: transactions } = useLocalData('transactions');
  const { data: products } = useLocalData('products');
  const { data: payouts } = useLocalData('payouts');
  const { data: debtors, update: updateDebtor } = useLocalData('debtors');
  const { add: addPayment } = useLocalData('debtPayments');
  const { remove: removeTx, update: updateTx } = useLocalData('transactions');
  const [period, setPeriod] = useState<ViewPeriod>('daily');

  const getDateRange = (forPeriod?: ViewPeriod) => {
    const now = new Date();
    let start: Date;
    const p = forPeriod || period;
    if (p === 'daily') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (p === 'weekly') { const day = now.getDay(); start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0); }
    else start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  };

  // Previous period for comparison
  const getPrevDateRange = () => {
    const now = new Date();
    let prevStart: Date, prevEnd: Date;
    if (period === 'daily') {
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'weekly') {
      prevStart = new Date(now); prevStart.setDate(now.getDate() - now.getDay() - 7); prevStart.setHours(0,0,0,0);
      prevEnd = new Date(now); prevEnd.setDate(now.getDate() - now.getDay()); prevEnd.setHours(0,0,0,0);
    } else {
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { prevStart, prevEnd };
  };

  const { start, end } = getDateRange();
  const { prevStart, prevEnd } = getPrevDateRange();

  const filteredTransactions = useMemo(() => transactions.filter((t: any) => t._creationTime >= start.getTime() && t._creationTime <= end.getTime()), [transactions, start, end]);
  const prevFilteredTransactions = useMemo(() => transactions.filter((t: any) => t._creationTime >= prevStart.getTime() && t._creationTime < prevEnd.getTime()), [transactions, prevStart, prevEnd]);

  const filteredPayouts = useMemo(() => payouts.filter((p: any) => p._creationTime >= start.getTime() && p._creationTime <= end.getTime()), [payouts, start, end]);

  const grossSales = filteredTransactions.reduce((sum: number, t: any) => sum + t.total, 0);
  const prevGrossSales = prevFilteredTransactions.reduce((sum: number, t: any) => sum + t.total, 0);
  const salesGrowth = prevGrossSales > 0 ? ((grossSales - prevGrossSales) / prevGrossSales) * 100 : grossSales > 0 ? 100 : 0;

  const totalDiscounts = filteredTransactions.reduce((sum: number, t: any) => sum + (t.discount || 0), 0);
  const totalPayoutsAmt = filteredPayouts.reduce((sum: number, p: any) => sum + p.amount, 0);
  const numTransactions = filteredTransactions.length;
  const prevNumTransactions = prevFilteredTransactions.length;
  const txnGrowth = prevNumTransactions > 0 ? ((numTransactions - prevNumTransactions) / prevNumTransactions) * 100 : numTransactions > 0 ? 100 : 0;
  const avgTicket = numTransactions > 0 ? grossSales / numTransactions : 0;

  // #5: Profit calculation with wholesale price warnings
  const profitData = useMemo(() => {
    let totalProfit = 0;
    let totalCost = 0;
    let itemsMissingWholesale = 0;
    let totalItems = 0;
    filteredTransactions.forEach((tx: any) => {
      (tx.items || []).forEach((item: any) => {
        totalItems++;
        const product = products.find((p: any) => p._id === item.productId || p.name === item.name);
        const wholesale = product?.wholesalePrice || item.wholesalePrice || 0;
        if (wholesale === 0 && item.price > 0) itemsMissingWholesale++;
        const cost = wholesale * item.quantity;
        totalCost += cost;
        totalProfit += item.subtotal - cost;
      });
    });
    return { totalProfit, totalCost, margin: grossSales > 0 ? (totalProfit / grossSales) * 100 : 0, itemsMissingWholesale, totalItems };
  }, [filteredTransactions, products, grossSales]);

  // Opening balance (from Cash Drawer, per-day)
  const openingBalance = (() => {
    const key = `dl-opening-${new Date().toISOString().slice(0, 10)}`;
    try { return parseInt(localStorage.getItem(key) || '0'); }
    catch { return 0; }
  })();

  const cashTransactions = filteredTransactions.filter((t: any) => t.paymentMethod === 'cash');
  const mpesaTransactions = filteredTransactions.filter((t: any) => t.paymentMethod === 'mpesa');
  const debtTransactions = filteredTransactions.filter((t: any) => t.paymentMethod === 'debt');

  const expectedCash = cashTransactions.reduce((sum: number, t: any) => sum + t.total, 0);
  const totalExpectedCash = openingBalance + expectedCash;
  const mpesaTotal = mpesaTransactions.reduce((sum: number, t: any) => sum + t.total, 0);

  // Accounts Receivable (separate from cash audit)
  const totalOutstandingDebt = debtors
    .filter((d: any) => d.status === 'active')
    .reduce((sum: number, d: any) => sum + d.amount, 0);
  const debtSalesTotal = debtTransactions.reduce((sum: number, t: any) => sum + t.total, 0);

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
      return `${new Date(t._creationTime).toLocaleDateString()},${fmtTime(t._creationTime)},${t.items.length},${t.paymentMethod},${t.discount},${t.total},${txProfit}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `dukahub-sales-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
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
        <div className="stat-card"><div className="flex items-center justify-between w-full"><span className="stat-label">Gross Sales</span><span className={`text-xs font-medium ${salesGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{salesGrowth >= 0 ? '↑' : '↓'} {Math.abs(salesGrowth).toFixed(0)}%</span></div><span className="stat-value text-emerald-400">KES {grossSales.toLocaleString()}</span><span className="text-xs text-[var(--text-muted)]">{numTransactions} txns vs {prevNumTransactions} prev</span></div>
        <div className="stat-card"><span className="stat-label">Avg. Ticket</span><span className="stat-value text-cyan-400">KES {avgTicket.toLocaleString()}</span><span className="text-xs text-[var(--text-muted)]">{period} average</span></div>
        <div className="stat-card"><span className={`stat-label ${profitData.itemsMissingWholesale > 0 ? 'text-amber-400' : ''}`}>Confirmed Profit {profitData.itemsMissingWholesale > 0 && <span className="badge-amber text-[10px] ml-1">⚠</span>}</span><span className={`stat-value ${profitData.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>KES {profitData.totalProfit.toLocaleString()}</span><span className="text-xs text-[var(--text-muted)]">{profitData.margin.toFixed(1)}% margin</span></div>
        <div className="stat-card"><span className="stat-label">Cost of Goods</span><span className="stat-value text-amber-400">KES {profitData.totalCost.toLocaleString()}</span><span className="text-xs text-[var(--text-muted)]">{profitData.totalItems} items sold</span></div>
        <div className="stat-card"><span className="stat-label">Txns This {period.charAt(0).toUpperCase() + period.slice(1)}</span><div className="flex items-end gap-2"><span className="stat-value text-cyan-400">{numTransactions}</span><span className={`text-xs font-medium mb-1 ${txnGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{txnGrowth >= 0 ? '↑' : '↓'} {Math.abs(txnGrowth).toFixed(0)}%</span></div><span className="text-xs text-[var(--text-muted)]">Discounts: KES {totalDiscounts.toLocaleString()}</span></div>
      </div>

      {profitData.itemsMissingWholesale > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
          <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          <div>
            <p className="text-sm font-medium text-amber-400">Wholesale Prices Missing</p>
            <p className="text-xs text-amber-400/70 mt-0.5">{profitData.itemsMissingWholesale} of {profitData.totalItems} items sold have no wholesale price set. Profit shown is for items with wholesale data only. Edit products in Stock to add wholesale prices.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Payment Breakdown</h2>
          <div className="space-y-3">
            {[{ label: 'Cash', icon: <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, amount: expectedCash, count: cashTransactions.length, color: 'text-emerald-400' },
              { label: 'M-Pesa', icon: <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>, amount: mpesaTotal, count: mpesaTransactions.length, color: 'text-cyan-400' },
              { label: 'Debt (Credit Sales)', icon: <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>, amount: debtSalesTotal, count: debtTransactions.length, color: 'text-amber-400' },
            ].map(({ label, icon, amount, count, color }) => (
              <div key={label} className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg">
                <span className="text-sm text-[var(--text-secondary)] flex items-center gap-2">{icon}{label}</span>
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
          <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg><h2 className="text-lg font-semibold text-[var(--text-primary)]">Profit Analysis</h2></div><span className="badge-emerald">{profitData.margin.toFixed(1)}% Margin</span></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><span className="text-sm text-[var(--text-secondary)]">Gross Sales</span><span className="text-sm font-bold text-emerald-400">KES {grossSales.toLocaleString()}</span></div>
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><span className="text-sm text-[var(--text-secondary)]">Cost of Goods Sold</span><span className="text-sm font-bold text-amber-400">-KES {profitData.totalCost.toLocaleString()}</span></div>
            <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-500/5 to-transparent rounded-lg">
                <div><span className="text-sm font-semibold text-[var(--text-primary)]">Confirmed Net Profit</span><p className="text-xs text-[var(--text-muted)] mt-0.5">Based on products with wholesale prices</p></div>
                <span className={`text-lg font-bold ${profitData.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  KES {profitData.totalProfit.toLocaleString()}
                </span>
              </div>
            </div>
            {profitData.itemsMissingWholesale > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2"><svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg><div><p className="text-sm font-medium text-amber-400">Incomplete Data</p><p className="text-xs text-amber-400/70 mt-0.5">{profitData.itemsMissingWholesale} item(s) lack wholesale prices. Set them in Stock for accurate profit tracking.</p></div></div>
            )}
            {profitData.totalProfit < 0 && profitData.itemsMissingWholesale === 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2"><svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg><div><p className="text-sm font-medium text-red-400">Negative Profit</p><p className="text-xs text-red-400/70 mt-0.5">Wholesale costs exceed sales. Review your pricing.</p></div></div>
            )}
          </div>
        </div>

        {/* Anti-Theft Cash Auditor - No debt mixed in */}
        <div className="card border-amber-500/20">
          <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg><h2 className="text-lg font-semibold text-[var(--text-primary)]">Anti-Theft Cash Auditor</h2></div><span className="badge-amber">Audit</span></div>
          <p className="text-xs text-[var(--text-muted)] mb-3">Tracks physical cash and mobile money only. Credit/debt is tracked separately below.</p>
          <div className="space-y-3">
            {openingBalance > 0 && <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><span className="text-sm text-[var(--text-secondary)]">Opening Balance</span><span className="text-sm font-bold text-emerald-400">KES {openingBalance.toLocaleString()}</span></div>}
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><span className="text-sm text-[var(--text-secondary)]">Cash Sales (today)</span><span className="text-sm font-bold text-emerald-400">KES {expectedCash.toLocaleString()}</span></div>
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg border-l-2 border-emerald-500"><div><span className="text-sm text-[var(--text-secondary)]">Expected Cash in Drawer</span><p className="text-xs text-[var(--text-muted)] mt-0.5">Opening + Cash Sales</p></div><span className="text-sm font-bold text-emerald-400">KES {totalExpectedCash.toLocaleString()}</span></div>
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><span className="text-sm text-[var(--text-secondary)]">M-Pesa Collected</span><span className="text-sm font-bold text-cyan-400">KES {mpesaTotal.toLocaleString()}</span></div>
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><span className="text-sm text-[var(--text-secondary)]">Cash Out (Payouts)</span><span className="text-sm font-bold text-red-400">-KES {totalPayoutsAmt.toLocaleString()}</span></div>
            <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3"><div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg"><div><span className="text-sm font-semibold text-[var(--text-primary)]">Net Cash Position</span><p className="text-xs text-[var(--text-muted)] mt-0.5">Expected cash in drawer − Payouts</p></div><span className={`text-lg font-bold ${totalExpectedCash - totalPayoutsAmt >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>KES {(totalExpectedCash - totalPayoutsAmt).toLocaleString()}</span></div></div>
            {totalExpectedCash - totalPayoutsAmt < 0 ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2"><svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg><div><p className="text-sm font-medium text-red-400">Discrepancy Detected</p><p className="text-xs text-red-400/70 mt-0.5">Payouts exceed expected cash. Review entries.</p></div></div>
            ) : numTransactions > 0 && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2"><svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><div><p className="text-sm font-medium text-emerald-400">All Clear</p><p className="text-xs text-emerald-400/70 mt-0.5">Physical cash and M-Pesa reconcile.</p></div></div>
            )}
          </div>
        </div>

        {/* NEW: Accounts Receivable Card (separate from cash audit) */}
        <div className="card border-blue-500/20">
          <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg><h2 className="text-lg font-semibold text-[var(--text-primary)]">Accounts Receivable</h2></div><span className="badge-blue">Daftari</span></div>
          <p className="text-xs text-[var(--text-muted)] mb-3">Money owed by credit customers. Tracked separately from cash drawer.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg border-l-2 border-blue-500">
              <div><span className="text-sm text-[var(--text-secondary)]">Total Outstanding Debt</span><p className="text-xs text-[var(--text-muted)] mt-0.5">From Daftari ledger</p></div>
              <span className="text-lg font-bold text-blue-400">KES {totalOutstandingDebt.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg">
              <span className="text-sm text-[var(--text-secondary)]">Credit Sales (this period)</span>
              <span className="text-sm font-semibold text-amber-400">KES {debtSalesTotal.toLocaleString()}</span>
            </div>
            {totalOutstandingDebt > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                <div><p className="text-sm font-medium text-amber-400">Uncollected Revenue</p><p className="text-xs text-amber-400/70 mt-0.5">KES {totalOutstandingDebt.toLocaleString()} is owed by debtors. Visit Daftari to follow up.</p></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Recent Transactions ({numTransactions})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[var(--text-muted)] border-b border-slate-200/60 dark:border-slate-800/60">
              <th className="text-left py-2 pr-2">Date</th><th className="text-right py-2 px-2">Items</th><th className="text-right py-2 px-2">Payment</th><th className="text-right py-2 px-2">Discount</th><th className="text-right py-2 px-2">Profit</th><th className="text-right py-2 px-2">Total</th><th className="text-right py-2 pl-2">Action</th>
            </tr></thead>
            <tbody>
              {filteredTransactions.slice(0, 20).map((t: any) => {
                let txProfit = 0;
                let txMissing = 0;
                (t.items || []).forEach((item: any) => {
                  const product = products.find((p: any) => p._id === item.productId || p.name === item.name);
                  const wholesale = product?.wholesalePrice || item.wholesalePrice || 0;
                  if (wholesale === 0 && item.price > 0) txMissing++;
                  txProfit += item.subtotal - (wholesale * item.quantity);
                });
                return (
                  <tr key={t._id} className="border-b border-slate-200/30 dark:border-slate-800/30 hover:bg-[var(--bg-surface2)]/50 transition-colors">
                    <td className="py-2 pr-2 text-[var(--text-secondary)] text-xs" title={new Date(t._creationTime).toLocaleDateString() + ' ' + fmtTime(t._creationTime)}>{fmtTimeRelative(t._creationTime)}{t.debtorName && <span className="block text-[10px] text-amber-400/70">{t.debtorName}</span>}</td>
                    <td className="py-2 px-2 text-right text-[var(--text-secondary)]">{t.items.length}{txMissing > 0 && <span className="text-[10px] text-amber-400 ml-1" title="Missing wholesale price">⚠</span>}</td>
                    <td className="py-2 px-2 text-right capitalize"><span className={`badge ${t.paymentMethod === 'cash' ? 'badge-emerald' : t.paymentMethod === 'mpesa' ? 'badge-cyan' : t.paymentMethod === 'debt' && t.debtorName ? 'badge-amber' : 'badge-amber'}`}>{t.paymentMethod === 'debt' && t.debtorName ? `${t.debtorName.slice(0, 8)}…` : t.paymentMethod}</span></td>
                    <td className="py-2 px-2 text-right text-amber-400">{t.discount > 0 ? `KES ${t.discount.toLocaleString()}` : '—'}</td>
                    <td className={`py-2 px-2 text-right ${txProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>KES {txProfit.toLocaleString()}{txMissing > 0 && <span className="text-[10px] text-amber-400 ml-1">*</span>}</td>
                    <td className="py-2 px-2 text-right text-cyan-400 font-medium">KES {t.total.toLocaleString()}</td>
                    <td className="py-2 pl-2 text-right">
                      {t.paymentMethod === 'debt' && t.debtorId && (
                        <button
                          onClick={() => {
                            const debtor = debtors.find((d: any) => d._id === t.debtorId);
                            if (!debtor || !confirm(`Mark KES ${t.total.toLocaleString()} debt from ${t.debtorName || 'debtor'} as paid?`)) return;
                            addPayment({ debtorId: t.debtorId, amount: t.total } as any);
                            updateDebtor(t.debtorId, { amount: Math.max(0, (debtor.amount || 0) - t.total), status: (debtor.amount - t.total) <= 0 ? 'cleared' : 'active' } as any);
                            updateTx(t._id, { paymentMethod: 'cash', debtorId: undefined, debtorName: undefined } as any);
                          }}
                          className="btn-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs px-2 py-1 hover:bg-emerald-500/20 transition-all whitespace-nowrap"
                        >
                          Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-[var(--text-muted)] text-sm">No transactions in this period</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
