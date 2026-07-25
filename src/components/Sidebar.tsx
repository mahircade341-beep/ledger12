import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../App';

const navItems = [
  { path: '/', label: 'POS', icon: '🛒' },
  { path: '/stock', label: 'Stock', icon: '📦' },
  { path: '/daftari', label: 'Daftari', icon: '📋' },
  { path: '/cash-drawer', label: 'Cash Drawer', icon: '💰' },
  { path: '/insights', label: 'Insights', icon: '📊' },
  { path: '/categories', label: 'Categories', icon: '🏷️' },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [online, setOnline] = useState(navigator.onLine);
  const [importStatus, setImportStatus] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const isGod = profile?.email === 'fahmanmanka25@gmail.com';

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'nav-link-active' : 'nav-link';

  const navLinks = navItems.map((item) => (
    <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClass} onClick={() => setOpen(false)}>
      <span className="text-lg">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  ));

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
        <button onClick={() => setOpen(true)} className="p-2 text-[var(--text-secondary)] hover:text-cyan-400 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">📒</span>
          <span className="font-bold text-[var(--text-primary)]">DukaLedger</span>
          {isGod && <span className="badge-cyan text-[10px]">GOD</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="btn-icon" title="Toggle theme">
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
          <button onClick={signOut} className="p-2 text-[var(--text-secondary)] hover:text-red-400 transition-colors" title="Sign Out">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />}

      {/* Sidebar drawer */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[var(--bg-surface)] border-r border-slate-200/60 dark:border-slate-800/60 transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        {/* Desktop header */}
        <div className="hidden lg:flex items-center gap-3 px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/20">📒</div>
          <div>
            <h1 className="font-bold text-[var(--text-primary)]">DukaLedger</h1>
            <p className="text-xs text-[var(--text-muted)]">v2.0</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">{navLinks}</nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
          {/* Theme toggle */}
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-200">
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-sm font-bold text-slate-900">
              {profile?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{profile?.fullName || 'User'}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{profile?.email}</p>
            </div>
            {isGod && <span className="badge-cyan text-[10px]">GOD</span>}
          </div>

          {/* Online status */}
          <div className="flex items-center gap-2 px-1">
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-xs text-[var(--text-muted)]">{online ? 'Online' : 'Offline'}</span>
          </div>

          {/* Data backup section */}
          <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2 space-y-1">
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1 mb-1">Data</p>
            <button onClick={() => {
              const keys = ['dl-auth', 'dl-profiles', 'dl-products', 'dl-transactions', 'dl-debtors', 'dl-debt-payments', 'dl-payouts', 'dl-categories', 'dl-theme'];
              const data: Record<string, any> = {};
              keys.forEach((k) => { try { const v = localStorage.getItem(k); if (v) data[k] = JSON.parse(v); } catch {} });
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url;
              a.download = `dukaledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click(); URL.revokeObjectURL(url);
            }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span>Export Data</span>
            </button>
            <button onClick={() => importRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
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
            {importStatus && <p className="text-xs text-emerald-400 px-1">{importStatus}</p>}
          </div>

          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all duration-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
