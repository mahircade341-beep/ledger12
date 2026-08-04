import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocalData } from '../hooks/useLocalData';

function fmtKES(n: number) {
  return 'KES ' + Math.round(n || 0).toLocaleString('en-KE');
}

export default function Home() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: transactions } = useLocalData('transactions');
  const { data: products } = useLocalData('products');
  const { data: debtors } = useLocalData('debtors');

  const storeName = profile?.storeName || localStorage.getItem('dl-store-name') || 'DukaHub';
  const initial = (storeName || 'D').charAt(0).toUpperCase();

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

  const favourites = [
    { label: 'POS', to: '/pos', icon: '🛒', grad: 'from-[#FF3B30] to-[#FF9500]' },
    { label: 'Daftari', to: '/daftari', icon: '📒', grad: 'from-[#BF5AF2] to-[#5E5CE6]' },
    { label: 'Cash', to: '/cash-drawer', icon: '💵', grad: 'from-[#30D158] to-[#00C7BE]' },
    { label: 'AI', to: '/ai-insights', icon: '🤖', grad: 'from-[#0A84FF] to-[#5E5CE6]' },
    { label: 'Reports', to: '/insights', icon: '📊', grad: 'from-[#FF375F] to-[#FF9F0A]' },
    { label: 'Stock', to: '/inventory', icon: '📦', grad: 'from-[#64D2FF] to-[#30D158]' },
  ];

  const collections = [
    { title: "Today's Sales", sub: `${today.count} transactions`, to: '/insights', color: 'collection-orange', stat: fmtKES(today.total) },
    { title: 'Low Stock Alerts', sub: `${lowStock} low · ${outOfStock} out`, to: '/inventory', color: 'collection-blue', stat: `${products.length} items` },
    { title: 'Debtors to Chase', sub: 'Credit ledger', to: '/daftari', color: 'collection-purple', stat: fmtKES(debtOutstanding) },
    { title: 'Cash in Drawer', sub: 'Audit & float', to: '/cash-drawer', color: 'collection-green', stat: fmtKES(today.cash) },
    { title: 'AI Shop Analysis', sub: 'What to fix first', to: '/ai-insights', color: 'collection-pink', stat: 'Groq · Live' },
    { title: 'Top Sellers', sub: 'Profit & margins', to: '/insights', color: 'collection-teal', stat: fmtKES(today.total) },
  ];

  return (
    <div className="space-y-6">
      {/* ── Featured header card ("From your favourites") ── */}
      <section className="featured-card p-4 sm:p-5 flex items-center gap-4">
        <div className="shrink-0">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold shadow-lg"
            style={{ background: 'var(--gradient-brand-mark)', color: 'var(--mark-text)', boxShadow: '0 8px 24px rgba(255,59,48,0.35)' }}
          >
            {initial}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">From your shop</p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate leading-tight">{storeName}</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">Retail Management · Free plan</p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-lg font-extrabold text-white">{fmtKES(today.total)}</span>
          <span className="text-[10px] text-[var(--text-muted)] font-semibold">today</span>
        </div>
        <button
          onClick={() => navigate('/insights')}
          className="topbar-pill shrink-0 !text-[0.78rem] !px-4 !py-2.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
          View Quick Stats
        </button>
      </section>

      {/* ── Favourites — circular avatars with white rings ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">★ Your favourites</h3>
          <button onClick={() => navigate('/pos')} className="text-xs font-bold text-[var(--text-accent)] hover:underline">
            Open POS
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar -mx-1 px-1">
          {favourites.map((f) => (
            <button key={f.label} onClick={() => navigate(f.to)} className="flex flex-col items-center gap-1.5 shrink-0 group">
              <div className={`avatar-ring bg-gradient-to-br ${f.grad}`}>
                <div className="text-lg">{f.icon}</div>
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] group-hover:text-white transition-colors">{f.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Collections / dash grid ── */}
      <section>
        <h3 className="text-sm font-bold text-white mb-3">Shop at a glance</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {collections.map((c) => (
            <button key={c.title} onClick={() => navigate(c.to)} className={`collection-card ${c.color}`}>
              <div className="absolute top-3 right-3 text-[11px] font-extrabold text-white/90">{c.stat}</div>
              <h3 className="pr-14">{c.title}</h3>
              <p>{c.sub}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── Quick stats strip ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-v2">
          <span className="stat-label-v2">Sales Today</span>
          <span className="stat-value-v2 !text-2xl">{today.count}</span>
          <span className="stat-desc-v2">{today.items} items sold</span>
        </div>
        <div className="stat-v2">
          <span className="stat-label-v2">M-Pesa</span>
          <span className="stat-value-v2 !text-2xl text-[#64D2FF]">{fmtKES(today.mpesa)}</span>
          <span className="stat-desc-v2">cash {fmtKES(today.cash)}</span>
        </div>
        <div className="stat-v2">
          <span className="stat-label-v2">Outstanding Debt</span>
          <span className="stat-value-v2 !text-2xl text-[#FFD60A]">{fmtKES(debtOutstanding)}</span>
          <span className="stat-desc-v2">{debtors.length} debtors</span>
        </div>
        <div className="stat-v2">
          <span className="stat-label-v2">Stock Health</span>
          <span className="stat-value-v2 !text-2xl text-[#30D158]">{products.length}</span>
          <span className="stat-desc-v2">{lowStock + outOfStock} need attention</span>
        </div>
      </section>

      <Link to="/login" className="hidden" aria-hidden="true" />
    </div>
  );
}
