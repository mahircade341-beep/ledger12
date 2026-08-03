import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../App';
import { useLocalData } from '../hooks/useLocalData';

const navItems = [
  { path: '/pos', label: 'POS', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3h11.25M9 3v18m-5.25-3h12.75a.75.75 0 00.75-.75V6.75a.75.75 0 00-.75-.75H3.75A.75.75 0 003 6.75v10.5a.75.75 0 00.75.75z" />
    </svg>
  )},
  { path: '/inventory', label: 'Inventory', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )},
  { path: '/stock', label: 'Stock Mgmt', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  )},
  { path: '/daftari', label: 'Daftari', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )},
  { path: '/cash-drawer', label: 'Cash Drawer', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { path: '/insights', label: 'Insights', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )},
  { path: '/settings', label: 'Settings', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const touchStartX = useRef(0);
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: products } = useLocalData('products');
  const navigate = useNavigate();
  const lowStockThreshold = parseInt(localStorage.getItem('dl-low-stock-threshold') || '5');
  const lowStockCount = products.filter((p: any) => p.quantity > 0 && p.quantity <= lowStockThreshold).length;
  const criticalCount = products.filter((p: any) => p.quantity <= 0).length;
  const storeName = profile?.storeName || localStorage.getItem('dl-store-name') || 'DukaHub';

  // Swipe to open sidebar on mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (touchStartX.current < 40 && dx > 60 && !open) setOpen(true);
      if (dx < -60 && open) setOpen(false);
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => { window.removeEventListener('touchstart', handleTouchStart); window.removeEventListener('touchend', handleTouchEnd); };
  }, [open]);

  return (
    <>
      {/* ── V2 Mobile Header ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-v2-nav flex items-center justify-between px-3 py-2.5 safe-bottom">
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(true)} className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--btn-ghost-hover-bg)] hover:text-[var(--text-primary)] transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm"
              style={{ background: 'var(--gradient-aurora)', color: 'var(--btn-primary-text)' }}>
              D
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-[var(--text-primary)] leading-tight truncate max-w-[110px]">{storeName}</span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium leading-tight">Retail Management</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={toggleTheme} className="theme-toggle-btn p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--btn-ghost-hover-bg)] transition-all" title="Toggle theme" aria-label="Toggle theme">
            <span className={`theme-toggle-icon ${theme === 'dark' ? 'entering-light' : 'entering-dark'}`}>
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </span>
          </button>
          <button onClick={signOut} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--btn-ghost-hover-bg)] transition-all" title="Sign Out" aria-label="Sign Out">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in-v2" onClick={() => setOpen(false)} />
      )}

      {/* ── V2 Sidebar ── */}
      <aside className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50 w-64 glass-v2-sidebar transform transition-all duration-300 ease-out ${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } flex flex-col`}>
        
        {/* ── V2 Sidebar Header ── */}
        <div className="hidden lg:flex items-center gap-3 px-5 py-5 border-b border-[var(--border-color)]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-lg shadow-glow"
            style={{ background: 'var(--gradient-aurora)', color: 'var(--btn-primary-text)', boxShadow: 'var(--btn-primary-shadow)' }}>
            D
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-[var(--text-primary)] truncate text-base">{storeName}</h1>
            <p className="text-[11px] text-[var(--text-muted)] font-medium leading-tight">Retail Management</p>
          </div>
        </div>

        {/* ── V2 Navigation ── */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
          {navItems.map((item) => {
            let badge = null;
            if (item.path === '/inventory' && (lowStockCount > 0 || criticalCount > 0)) {
              badge = (
                <span className="ml-auto flex items-center gap-1">
                  {criticalCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 ring-1 ring-red-500/30" />}
                  {lowStockCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 ring-1 ring-amber-500/30" />}
                </span>
              );
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/pos'}
                className={({ isActive }) => isActive ? 'nav-v2-active' : 'nav-v2'}
                onClick={() => setOpen(false)}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {badge}
              </NavLink>
            );
          })}
        </nav>

        {/* ── V2 User Section ── */}
        <div className="p-3 border-t border-[var(--border-color)] space-y-2">
          {/* Quick Actions */}
          <div className="flex items-center gap-1 px-1">
            <button onClick={() => {
              const current = localStorage.getItem('dl-time-format') || '12h';
              const next = current === '12h' ? '24h' : '12h';
              localStorage.setItem('dl-time-format', next);
              window.dispatchEvent(new Event('timeformatchange'));
            }} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--btn-ghost-hover-bg)] transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {(localStorage.getItem('dl-time-format') || '12h') === '12h' ? '12h' : '24h'}
            </button>
            <button onClick={toggleTheme} className="theme-toggle-btn flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--btn-ghost-hover-bg)] transition-all">
              <span className={`theme-toggle-icon ${theme === 'dark' ? 'entering-light' : 'entering-dark'}`}>
                {theme === 'dark' ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
              </span>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 px-1 py-0.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'var(--gradient-aurora)', color: 'var(--btn-primary-text)' }}>
              {profile?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">{profile?.fullName || 'User'}</p>
              <p className="text-[11px] text-[var(--text-muted)] truncate font-medium">{profile?.email}</p>
            </div>
          </div>

          {/* Cloud status */}
          <div className="flex items-center gap-2 px-1">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500 ring-1 ring-emerald-500/30" />
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-medium">Connected</span>
          </div>
        </div>
      </aside>
    </>
  );
}
