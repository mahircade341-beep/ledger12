import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import BottomTabBar from './BottomTabBar';
import ToastAlerts from './ToastAlerts';
import InstallBanner from './InstallBanner';
import AnimatedBackground from './AnimatedBackground';
import { useAuth } from '../contexts/AuthContext';
import { useLocalData } from '../hooks/useLocalData';
import { startAutoSync } from '../lib/syncEngine';

function fmtKES(n: number) {
  return 'KES ' + Math.round(n || 0).toLocaleString('en-KE');
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { data: transactions } = useLocalData('transactions');
  const { data: products } = useLocalData('products');
  const { data: debtors } = useLocalData('debtors');
  const [overlayOpen, setOverlayOpen] = useState(false);

  // Never float the dock over the checkout screen.
  const isPos = location.pathname.startsWith('/pos');

  useEffect(() => {
    startAutoSync();
  }, []);

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
  const debtOutstanding = debtors.filter((d: any) => d.status === 'active').reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);

  // Day progress for the activity bar
  const dayProgress = useMemo(() => {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return Math.min(100, Math.max(4, ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100));
  }, []);

  return (
    <div className="min-h-screen bg-ios26">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AnimatedBackground />
      <TopBar />

      <main id="main-content" tabIndex={-1} className="pt-16 scrollbar-thin relative">
        <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto min-h-[calc(100vh-112px)] animate-fade-in-v2 pb-40 lg:pb-36">
          <Outlet />
        </div>
      </main>

      {/* ── Floating quick action dock — hidden on POS ── */}
      {!isPos && (
        <div className="fixed left-3 right-3 lg:left-auto lg:right-6 z-40 bottom-[84px] max-w-md mx-auto lg:mx-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <button
            onClick={() => setOverlayOpen(true)}
            className="mini-dock w-full flex items-center gap-3 px-3 py-2.5 text-left group"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-extrabold shrink-0"
              style={{ background: 'var(--gradient-brand-mark)', color: 'var(--mark-text)', boxShadow: '0 4px 14px rgba(255,59,48,0.4)' }}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-white truncate leading-tight">Today at {storeName}</p>
              <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">
                {fmtKES(today.total)} · {today.count} sales · {today.items} items
              </p>
              {/* activity progress */}
              <div className="mt-1 h-1 rounded-full bg-[var(--bg-surface3)] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#FF3B30] to-[#FF9500] transition-all" style={{ width: `${dayProgress}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span
                onClick={(e) => { e.stopPropagation(); navigate('/pos'); }}
                className="w-10 h-10 rounded-full bg-white text-[#090A0C] flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Open POS"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>
              </span>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] group-hover:text-white transition-colors cursor-pointer" title="Go to reports" onClick={(e) => { e.stopPropagation(); navigate('/insights'); }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ── Fullscreen summary overlay ── */}
      {overlayOpen && (
        <div className="fixed inset-0 z-[70] overlay-summary overflow-y-auto">
          <div className="absolute inset-x-0 top-0 h-64 pointer-events-none" style={{ background: 'radial-gradient(80% 100% at 50% 0%, rgba(255,59,48,0.22), transparent 70%)' }} />
          <div className="relative min-h-full flex flex-col px-6 py-8 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-white/85" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" /></svg>
                Today's summary
              </span>
              <button onClick={() => setOverlayOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-extrabold mb-5 shadow-2xl"
                style={{ background: 'var(--gradient-brand-mark)', color: 'var(--mark-text)', boxShadow: '0 16px 48px rgba(255,59,48,0.45)' }}>
                {initial}
              </div>
              <h2 className="text-2xl font-extrabold text-white">{storeName}</h2>
              <p className="text-[13px] text-[var(--text-muted)] mt-1">Live sales today</p>
              <p className="text-5xl font-extrabold mt-3 text-white">{fmtKES(today.total)}</p>
              <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">{today.count} transactions · {today.items} items sold</p>
            </div>

            {/* Activity bar */}
            <div className="mb-8">
              <div className="h-1.5 rounded-full bg-[var(--bg-surface3)] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#FF3B30] to-[#FF9500]" style={{ width: `${dayProgress}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-semibold mt-1.5">
                <span>00:00</span><span>12:00</span><span>23:59</span>
              </div>
            </div>

            {/* Main actions */}
            <div className="flex items-center justify-center gap-6 mb-8">
              <button onClick={() => { setOverlayOpen(false); navigate('/insights'); }} className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors" title="Reports">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                <span className="text-[10px] font-bold">Reports</span>
              </button>
              <button
                onClick={() => { setOverlayOpen(false); navigate('/pos'); }}
                className="w-20 h-20 rounded-full bg-white text-[#090A0C] flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95"
                title="Open POS"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>
              </button>
              <button onClick={() => { setOverlayOpen(false); navigate('/cash-drawer'); }} className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors" title="Cash drawer">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-[10px] font-bold">Cash</span>
              </button>
            </div>

            {/* Summary tags */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <span className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'rgba(48,209,88,0.16)', border: '1px solid rgba(48,209,88,0.35)' }}>💵 Cash {fmtKES(today.cash)}</span>
              <span className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'rgba(100,210,255,0.16)', border: '1px solid rgba(100,210,255,0.35)' }}>📱 M-Pesa {fmtKES(today.mpesa)}</span>
              <span className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'rgba(255,214,10,0.14)', border: '1px solid rgba(255,214,10,0.35)' }}>📒 Debt {fmtKES(debtOutstanding)}</span>
              <span className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'rgba(255,59,48,0.16)', border: '1px solid rgba(255,59,48,0.35)' }}>⚠️ {lowStock} low stock</span>
            </div>

            <button onClick={() => setOverlayOpen(false)} className="mt-auto w-full py-3.5 rounded-2xl font-bold text-sm text-[#090A0C] bg-white hover:bg-white/90 transition-all">
              Done
            </button>
          </div>
        </div>
      )}

      <BottomTabBar />
      <InstallBanner />
      <ToastAlerts />
    </div>
  );
}
