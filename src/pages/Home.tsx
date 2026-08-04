import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocalData } from '../hooks/useLocalData';

function fmtKES(n: number) {
  return 'KES ' + Math.round(n || 0).toLocaleString('en-KE');
}

function fmtTime(ts: number) {
  const pref = localStorage.getItem('dl-time-format') || '12h';
  if (pref === '24h') return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const quickActions = [
  { label: 'New Sale', to: '/pos', icon: '🛒', hint: 'Start checkout' },
  { label: 'Catalog', to: '/inventory', icon: '📦', hint: 'Products & stock' },
  { label: 'Daftari', to: '/daftari', icon: '📒', hint: 'Debtor ledger' },
  { label: 'Cash Drawer', to: '/cash-drawer', icon: '💵', hint: 'Audit & float' },
  { label: 'Reports', to: '/insights', icon: '📊', hint: 'Sales & trends' },
  { label: 'AI Insights', to: '/ai-insights', icon: '🤖', hint: 'Shop analysis' },
];

export default function Home() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: transactions } = useLocalData('transactions');
  const { data: products } = useLocalData('products');
  const { data: debtors } = useLocalData('debtors');

  const storeName = profile?.storeName || localStorage.getItem('dl-store-name') || 'DukaHub';

  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todays = transactions.filter((t: any) => t._creationTime >= start.getTime());
    const total = todays.reduce((s: number, t: any) => s + (Number(t.total) || 0), 0);
    const cash = todays.filter((t: any) => t.paymentMethod === 'cash').reduce((s: number, t: any) => s + (Number(t.total) || 0), 0);
    const mpesa = todays.filter((t: any) => t.paymentMethod === 'mpesa').reduce((s: number, t: any) => s + (Number(t.total) || 0), 0);
    const credit = todays.filter((t: any) => t.paymentMethod === 'credit' || t.debtorId).reduce((s: number, t: any) => s + (Number(t.total) || 0), 0);
    const items = todays.reduce((s: number, t: any) => s + (t.items || []).reduce((a: number, i: any) => a + (Number(i.quantity) || 0), 0), 0);
    return { count: todays.length, total, cash, mpesa, credit, items };
  }, [transactions]);

  const threshold = parseInt(localStorage.getItem('dl-low-stock-threshold') || '5');
  const lowStock = products.filter((p: any) => p.quantity > 0 && p.quantity <= threshold).length;
  const outOfStock = products.filter((p: any) => p.quantity <= 0).length;
  const debtOutstanding = debtors.filter((d: any) => d.status === 'active').reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);

  const recentSales = useMemo(
    () =>
      [...transactions]
        .sort((a: any, b: any) => (b._creationTime || 0) - (a._creationTime || 0))
        .slice(0, 6),
    [transactions]
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Greeting ── */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{greeting}, {storeName}</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={() => navigate('/pos')} className="btn-v2-primary text-sm h-10">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          New Sale
        </button>
      </section>

      {/* ── KPI tiles ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-v2 stat-v2-accent">
          <span className="stat-label-v2">Sales Today</span>
          <span className="stat-value-v2 !text-2xl">{fmtKES(today.total)}</span>
          <span className="stat-desc-v2">{today.count} transactions · {today.items} items</span>
        </div>
        <div className="stat-v2 stat-v2-success">
          <span className="stat-label-v2">M-Pesa</span>
          <span className="stat-value-v2 !text-2xl">{fmtKES(today.mpesa)}</span>
          <span className="stat-desc-v2">cash {fmtKES(today.cash)}</span>
        </div>
        <div className="stat-v2 stat-v2-warning">
          <span className="stat-label-v2">Outstanding Debt</span>
          <span className="stat-value-v2 !text-2xl">{fmtKES(debtOutstanding)}</span>
          <span className="stat-desc-v2">{debtors.length} debtors</span>
        </div>
        <div className="stat-v2 stat-v2-danger">
          <span className="stat-label-v2">Stock Health</span>
          <span className="stat-value-v2 !text-2xl">{products.length}</span>
          <span className="stat-desc-v2">{lowStock + outOfStock} need attention</span>
        </div>
      </section>

      {/* ── Quick actions ── */}
      <section>
        <h2 className="text-sm font-bold text-white mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.to)}
              className="card-v2 flex flex-col items-start gap-2 text-left hover:border-[var(--border-strong)] hover:-translate-y-0.5 transition-all active:scale-[0.98]"
            >
              <span className="text-xl">{a.icon}</span>
              <span className="w-full">
                <span className="block text-sm font-bold text-white">{a.label}</span>
                <span className="block text-[10px] text-[var(--text-muted)] font-medium">{a.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Alerts ── */}
      {(lowStock > 0 || outOfStock > 0 || debtOutstanding > 0) && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {outOfStock > 0 && (
            <button onClick={() => navigate('/inventory')} className="p-3 rounded-xl text-left border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 transition-colors">
              <p className="text-xs font-bold text-[var(--color-danger)]">Out of stock</p>
              <p className="text-lg font-extrabold text-white mt-0.5">{outOfStock} products</p>
              <p className="text-[10px] text-[var(--text-muted)]">Restock to keep selling →</p>
            </button>
          )}
          {lowStock > 0 && (
            <button onClick={() => navigate('/inventory')} className="p-3 rounded-xl text-left border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 transition-colors">
              <p className="text-xs font-bold text-[var(--color-warning)]">Low stock</p>
              <p className="text-lg font-extrabold text-white mt-0.5">{lowStock} products</p>
              <p className="text-[10px] text-[var(--text-muted)]">At or below threshold (≤ {threshold}) →</p>
            </button>
          )}
          {debtOutstanding > 0 && (
            <button onClick={() => navigate('/daftari')} className="p-3 rounded-xl text-left border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/15 transition-colors">
              <p className="text-xs font-bold text-[var(--color-info)]">Debtors to chase</p>
              <p className="text-lg font-extrabold text-white mt-0.5">{fmtKES(debtOutstanding)}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Outstanding credit →</p>
            </button>
          )}
        </section>
      )}

      {/* ── Recent sales ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">Recent sales</h2>
          <button onClick={() => navigate('/insights')} className="text-xs font-bold text-[var(--text-accent)] hover:underline">
            View all →
          </button>
        </div>
        {recentSales.length === 0 ? (
          <div className="card-v2 text-center py-10">
            <p className="text-2xl mb-2">🛒</p>
            <p className="text-sm font-semibold text-white">No sales yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Ring up your first sale to see it here.</p>
            <button onClick={() => navigate('/pos')} className="btn-v2-primary text-xs mt-4 h-9">Open POS</button>
          </div>
        ) : (
          <div className="card-v2 divide-y divide-[var(--border-color)] !p-0 overflow-hidden">
            {recentSales.map((t: any) => (
              <button
                key={t._id}
                onClick={() => navigate('/insights')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--nav-hover-bg)] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--bg-surface2)] flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {(t._id || '').slice(-4).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {(t.items || []).length > 0
                      ? (t.items as any[]).map((i: any) => `${i.name} ×${i.quantity}`).join(', ')
                      : 'Sale'}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium">
                    {fmtTime(t._creationTime)} · {t.paymentMethod || 'cash'}{t.debtorName ? ` · ${t.debtorName}` : ''}
                  </p>
                </div>
                <span className="text-sm font-bold text-white shrink-0">{fmtKES(t.total)}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
