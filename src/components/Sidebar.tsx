import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../App';
import { useLocalData } from '../hooks/useLocalData';

const navItems = [
  { path: '/', label: 'POS', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3h11.25M9 3v18m-5.25-3h12.75a.75.75 0 00.75-.75V6.75a.75.75 0 00-.75-.75H3.75A.75.75 0 003 6.75v10.5a.75.75 0 00.75.75z" />
    </svg>
  )},
  { path: '/stock', label: 'Stock', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
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
  { path: '/categories', label: 'Categories', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
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
  const lowStockThreshold = parseInt(localStorage.getItem('dl-low-stock-threshold') || '5');
  const lowStockCount = products.filter((p: any) => p.quantity > 0 && p.quantity <= lowStockThreshold).length;
  const criticalCount = products.filter((p: any) => p.quantity <= 0).length;
  const [online, setOnline] = useState(navigator.onLine);
  const [importStatus, setImportStatus] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const isGod = profile?.email === 'fahmanmanka25@gmail.com';

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

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) => isActive ? 'nav-link-active' : 'nav-link';

  const navLinks = navItems.map((item) => {
    let badge = null;
    if (item.path === '/stock' && (lowStockCount > 0 || criticalCount > 0)) {
      badge = <span className="ml-auto flex items-center gap-1">{criticalCount > 0 && <span className="w-2 h-2 rounded-full bg-red-400 shadow-sm shadow-red-400/40" />}{lowStockCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/40" />}</span>;
    }
    return (
      <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClass} onClick={() => setOpen(false)}>
        {item.icon}
        <span className="flex-1">{item.label}</span>
        {badge}
      </NavLink>
    );
  });

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
        <button onClick={() => setOpen(true)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-cyan-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-xs shadow-sm">📒</div>
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">DukaLedger</span>
          {isGod && <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-cyan-500/20">GOD</span>}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Toggle theme">
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
            )}
          </button>
          <button onClick={signOut} className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Sign Out">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />}

      {/* Sidebar drawer */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200/60 dark:border-slate-800/60 transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        {/* Desktop header */}
        <div className="hidden lg:flex items-center gap-3 px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/20">📒</div>
          <div>
            <h1 className="font-bold text-slate-800 dark:text-slate-100">DukaLedger</h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Retail Management</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">{navLinks}</nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2 bg-slate-50/50 dark:bg-transparent">
          {/* Time format toggle */}
          <button onClick={() => {
            const current = localStorage.getItem('dl-time-format') || '12h';
            const next = current === '12h' ? '24h' : '12h';
            localStorage.setItem('dl-time-format', next);
            window.dispatchEvent(new Event('timeformatchange'));
          }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{(localStorage.getItem('dl-time-format') || '12h') === '12h' ? '12-Hour Time' : '24-Hour Time'}</span>
          </button>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-200">
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
            )}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* User info */}
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-cyan-500/10 shrink-0">
              {profile?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate leading-tight">{profile?.fullName || 'User'}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{profile?.email}</p>
            </div>
            {isGod && <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-cyan-500/20 shrink-0">GOD</span>}
          </div>

          {/* Online status */}
          <div className="flex items-center gap-2 px-1">
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-red-500'} shadow-sm ${online ? 'shadow-emerald-500/40' : 'shadow-red-500/40'}`} />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{online ? 'Online' : 'Offline'}</span>
          </div>

          {/* Data backup section */}
          <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2 space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mb-1">Data</p>
            <button onClick={() => {
              const keys = ['dl-auth', 'dl-profiles', 'dl-products', 'dl-transactions', 'dl-debtors', 'dl-debt-payments', 'dl-payouts', 'dl-categories', 'dl-theme'];
              const data: Record<string, any> = {};
              keys.forEach((k) => { try { const v = localStorage.getItem(k); if (v) data[k] = JSON.parse(v); } catch {} });
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url;
              a.download = `dukaledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click(); URL.revokeObjectURL(url);
            }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              <span>Export Data</span>
            </button>
            <button onClick={() => importRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              <span>Import Data</span>
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                try {
                  const data = JSON.parse(ev.target?.result as string);
                  const valid = ['dl-products', 'dl-transactions', 'dl-debtors', 'dl-payouts'];
                  let count = 0;
                  valid.forEach((k) => { if (data[k]) { localStorage.setItem(k, JSON.stringify(data[k])); count++; } });
                  setImportStatus(`Imported ${count} tables — reload to see changes`);
                  setTimeout(() => setImportStatus(''), 4000);
                } catch { setImportStatus('Invalid file'); setTimeout(() => setImportStatus(''), 3000); }
              };
              reader.readAsText(file);
              e.target.value = '';
            }} />
            {importStatus && <p className="text-xs text-emerald-500 px-1">{importStatus}</p>}
          </div>

          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all duration-200 border border-transparent hover:border-red-500/10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
