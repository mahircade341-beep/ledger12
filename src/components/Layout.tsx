import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
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

  // Day progress for the scrubber-style bar
  const dayProgress = useMemo(() => {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return Math.min(100, Math.max(4, ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100));
  }, []);

  return (
    <div className="min-h-screen flex bg-ios26">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AnimatedBackground />
      <Sidebar />

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto lg:pt-0 pt-14 scrollbar-thin relative">
        <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto min-h-[calc(100vh-56px)] lg:min-h-screen animate-fade-in-v2 pb-36 lg:pb-10">
          <Outlet />
        </div>
      </main>

      {/* ── Floating mini dock (quick action player) — hidden on POS ── */}
      {!isPos && (
        <div className="fixed left-3 right-3 lg:left-auto lg:right-6 z-40 lg:bottom-6 bottom-[76px] max-w-md mx-auto lg:mx-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
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
              {/* scrubber-style progress */}
              <div className="mt-1 h-1 rounded-full bg-[var(--bg-surface3)] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#FF3B30] to-[#FF9500] transition-all" style={{ width: `${dayProgress}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span
                onClick={(e) => { e.stopPropagation(); navigate('/pos'); }}
                className="w-10 h-10 rounded-full bg-white text-[#090A0C] flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Start a sale"
              >
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.14v13.72c0 .84.92 1.34 1.63.88l10.48-6.86a1.05 1.05 0 000-1.76L9.63 4.26A1.05 1.05 0 008 5.14z" /></svg>
              </span>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] group-hover:text-white transition-colors cursor-pointer" title="Skip to reports" onClick={(e) => { e.stopPropagation(); navigate('/insights'); }}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5.14v13.72c0 .84.92 1.34 1.63.88l8.48-6.14V19a1 1 0 102 0V5a1 1 0 10-2 0v-1.6L6.63 4.26A1.05 1.05 0 005 5.14z" /></svg>
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ── Fullscreen overlay player (expanded quick stats) ── */}
      {overlayOpen && (
        <div className="fixed inset-0 z-[70] overlay-player overflow-y-auto">
          <div className="absolute inset-x-0 top-0 h-64 pointer-events-none" style={{ background: 'radial-gradient(80% 100% at 50% 0%, rgba(255,59,48,0.22), transparent 70%)' }} />
          <div className="relative min-h-full flex flex-col px-6 py-8 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-white/85" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" /></svg>
                Today's briefing
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

            {/* Scrubber */}
            <div className="mb-8">
              <div className="h-1.5 rounded-full bg-[var(--bg-surface3)] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#FF3B30] to-[#FF9500]" style={{ width: `${dayProgress}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-semibold mt-1.5">
                <span>00:00</span><span>12:00</span><span>23:59</span>
              </div>
            </div>

            {/* Big circular action */}
            <div className="flex items-center justify-center gap-6 mb-8">
              <button onClick={() => { setOverlayOpen(false); navigate('/insights'); }} className="text-white/70 hover:text-white transition-colors" title="Reports">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M11.4 2.02a1 1 0 011.2 0l10 7A1 1 0 0121.5 10.5H19v8a2 2 0 01-2 2h-3v-6h-4v6H7a2 2 0 01-2-2v-8H2.5a1 1 0 01-.7-1.7l9.6-8.28z" /></svg>
              </button>
              <button
                onClick={() => { setOverlayOpen(false); navigate('/pos'); }}
                className="w-20 h-20 rounded-full bg-white text-[#090A0C] flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95"
                title="Start a sale"
              >
                <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.14v13.72c0 .84.92 1.34 1.63.88l10.48-6.86a1.05 1.05 0 000-1.76L9.63 4.26A1.05 1.05 0 008 5.14z" /></svg>
              </button>
              <button onClick={() => { setOverlayOpen(false); navigate('/cash-drawer'); }} className="text-white/70 hover:text-white transition-colors" title="Cash drawer">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5.14v13.72c0 .84.92 1.34 1.63.88l8.48-6.14V19a1 1 0 102 0V5a1 1 0 10-2 0v-1.6L6.63 4.26A1.05 1.05 0 005 5.14z" /></svg>
              </button>
            </div>

            {/* Floating feature tags */}
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
