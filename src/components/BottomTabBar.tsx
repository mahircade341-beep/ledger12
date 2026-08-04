import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useLocalData } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';

const tabs = [
  {
    path: '/home',
    label: 'Home',
    icon: (active: boolean) => (
      <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
      </svg>
    ),
  },
  {
    path: '/inventory',
    label: 'Catalog',
    icon: (active: boolean) => (
      <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    badge: 'inventory',
  },
  {
    path: '/more',
    label: 'More',
    sheet: true,
    icon: (active: boolean) => (
      <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    ),
  },
];

const moreItems = [
  { path: '/pos', label: 'POS Counter', icon: '🛒', grad: 'from-[#FF3B30] to-[#FF9500]' },
  { path: '/daftari', label: 'Daftari', icon: '📒', grad: 'from-[#BF5AF2] to-[#5E5CE6]' },
  { path: '/cash-drawer', label: 'Cash Drawer', icon: '💵', grad: 'from-[#30D158] to-[#00C7BE]' },
  { path: '/insights', label: 'Reports', icon: '📊', grad: 'from-[#FF375F] to-[#FF9F0A]' },
  { path: '/ai-insights', label: 'AI Insights', icon: '🤖', grad: 'from-[#0A84FF] to-[#5E5CE6]' },
  { path: '/analytics', label: 'Analytics', icon: '📈', grad: 'from-[#64D2FF] to-[#30D158]' },
  { path: '/stock', label: 'Stock Mgmt', icon: '🏷️', grad: 'from-[#5E5CE6] to-[#BF5AF2]' },
  { path: '/settings', label: 'Settings', icon: '⚙️', grad: 'from-[#8E8E93] to-[#A1A1A6]' },
];

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: products } = useLocalData('products');
  const [sheetOpen, setSheetOpen] = useState(false);

  const lowStockThreshold = parseInt(localStorage.getItem('dl-low-stock-threshold') || '5');
  const lowStockCount = products.filter((p: any) => p.quantity > 0 && p.quantity <= lowStockThreshold).length;
  const criticalCount = products.filter((p: any) => p.quantity <= 0).length;
  const totalAlerts = lowStockCount + criticalCount;

  const isMoreActive = moreItems.some((m) => location.pathname === m.path || location.pathname.startsWith(m.path + '/'));
  const sheetTrigger = location.pathname === '/settings' || location.pathname.startsWith('/settings/');

  return (
    <>
      {/* ── Glass More sheet ── */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in-v2" />
          <div
            className="relative rounded-t-3xl border-t border-[var(--border-strong)] animate-slide-up-v2 max-h-[80vh] overflow-y-auto"
            style={{ background: 'rgba(18,20,24,0.97)', boxShadow: '0 -16px 48px rgba(0,0,0,0.7)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-base font-extrabold text-white">Browse all</h3>
              <button onClick={() => setSheetOpen(false)} className="w-8 h-8 rounded-full bg-[var(--bg-surface2)] text-[var(--text-muted)] flex items-center justify-center hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 px-5 pb-5">
              {moreItems.map((m) => (
                <button
                  key={m.path}
                  onClick={() => { setSheetOpen(false); navigate(m.path); }}
                  className={`flex flex-col items-center gap-2 py-3 rounded-2xl transition-all ${
                    location.pathname.startsWith(m.path) ? 'bg-[var(--nav-active-bg)] ring-1 ring-[var(--nav-active-border)]' : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface2)]'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.grad} flex items-center justify-center text-lg shadow-lg`}>{m.icon}</div>
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{m.label}</span>
                </button>
              ))}
              <button
                onClick={() => { setSheetOpen(false); signOut(); }}
                className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface2)] transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF453A] to-[#FF6961] flex items-center justify-center text-lg shadow-lg">🚪</div>
                <span className="text-[11px] font-semibold text-[var(--color-danger)]">Sign out</span>
              </button>
            </div>
            <div className="h-6" />
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="bottom-nav-glass">
          <div className="flex items-center justify-around px-2 pt-1.5 pb-1.5">
            {tabs.map((tab) => {
              const isActive = !tab.sheet && (location.pathname === tab.path || location.pathname.startsWith(tab.path + '/'));
              const isSheetActive = !!tab.sheet && (isMoreActive || sheetTrigger || sheetOpen);
              const showBadge = tab.badge === 'inventory' && totalAlerts > 0;

              if (tab.sheet) {
                return (
                  <button
                    key={tab.path}
                    onClick={() => setSheetOpen((o) => !o)}
                    className={`relative flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all duration-200 ${
                      isSheetActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {tab.icon(isSheetActive)}
                    <span className={`text-[10px] font-semibold leading-tight ${isSheetActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              }

              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={`relative flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all duration-200 ${
                    isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="relative">
                    {tab.icon(isActive)}
                    {showBadge && (
                      <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#FF453A] ring-2 ring-[var(--bg-primary)] animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-gradient-to-r from-[#FF3B30] to-[#FF9500]" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
