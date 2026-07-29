import { useState } from 'react';
import { useTheme } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { useLocalData } from '../hooks/useLocalData';

function fmtTime(ts: number) {
  const pref = localStorage.getItem('dl-time-format') || '12h';
  if (pref === '24h') return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut, userId, appLockEnabled, setAppPassword, removeAppPassword } = useAuth();
  const { data: products } = useLocalData('products');
  const isAdmin = profile?.role === 'admin' || profile?.role === 'user';

  const [timeFormat, setTimeFormat] = useState(localStorage.getItem('dl-time-format') || '12h');
  const [threshold, setThreshold] = useState(parseInt(localStorage.getItem('dl-low-stock-threshold') || '5'));
  const [importStatus, setImportStatus] = useState('');
  const [saved, setSaved] = useState(false);
  const [showAppPass, setShowAppPass] = useState(false);
  const [newAppPass, setNewAppPass] = useState('');
  const [confirmAppPass, setConfirmAppPass] = useState('');
  const [appPassError, setAppPassError] = useState('');
  const [appPassLoading, setAppPassLoading] = useState(false);
  const [securityQ, setSecurityQ] = useState('');
  const [securityA, setSecurityA] = useState('');

  const handleTimeFormat = (fmt: string) => {
    setTimeFormat(fmt);
    localStorage.setItem('dl-time-format', fmt);
    window.dispatchEvent(new Event('timeformatchange'));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const handleThreshold = (val: number) => {
    const v = Math.max(1, Math.min(100, val));
    setThreshold(v);
    localStorage.setItem('dl-low-stock-threshold', v.toString());
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const lowStockCount = products.filter((p: any) => p.quantity > 0 && p.quantity <= threshold).length;
  const criticalCount = products.filter((p: any) => p.quantity <= 0).length;

  const exportData = () => {
    const keys = ['dl-auth', 'dl-profiles', 'dl-products', 'dl-transactions', 'dl-debtors', 'dl-debt-payments', 'dl-payouts', 'dl-categories', 'dl-theme'];
    const data: Record<string, any> = {};
    keys.forEach((k) => { try { const v = localStorage.getItem(k); if (v) data[k] = JSON.parse(v); } catch {} });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `dukahub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleSetAppPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppPassError('');
    if (newAppPass.length < 4) { setAppPassError('Password must be at least 4 characters'); return; }
    if (newAppPass !== confirmAppPass) { setAppPassError('Passwords do not match'); return; }
    if (!securityQ.trim() || !securityA.trim()) { setAppPassError('Please set a security question and answer for password recovery'); return; }
    setAppPassLoading(true);
    try {
      await setAppPassword(newAppPass, securityQ.trim(), securityA.trim());
      localStorage.setItem('dl-locked', 'true');
      setNewAppPass('');
      setConfirmAppPass('');
      setSecurityQ('');
      setSecurityA('');
      setShowAppPass(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      alert('App lock password set with recovery question! Close and reopen the app to test it.');
    } catch (err: any) {
      setAppPassError(err?.message || 'Failed to set password');
    }
    setAppPassLoading(false);
  };

  const handleRemoveAppPassword = () => {
    if (!confirm('Remove app lock password? The app will no longer lock on reopen.')) return;
    removeAppPassword();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage app preferences and data</p>
        </div>
        {saved && <span className="badge-emerald animate-fade-in">Saved</span>}
      </div>

      {/* Appearance */}
      <div className="card border-blue-500/20">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Appearance</h2>
        </div>
        <div className="space-y-4">
          <div className="cmp-item">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Theme</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Switch between dark and light mode</p>
            </div>
            <button onClick={toggleTheme} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'dark' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-200 text-slate-700'}`}>
              {theme === 'dark' ? (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg> Light Mode</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg> Dark Mode</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card border-cyan-500/20">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Preferences</h2>
        </div>
        <div className="space-y-4">
          {/* Time Format */}
          <div className="cmp-item">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Time Format</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Display times in 12-hour or 24-hour format</p>
            </div>
            <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button onClick={() => handleTimeFormat('12h')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${timeFormat === '12h' ? 'bg-cyan-500/20 text-cyan-400' : 'text-[var(--text-muted)]'}`}>12h</button>
              <button onClick={() => handleTimeFormat('24h')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${timeFormat === '24h' ? 'bg-cyan-500/20 text-cyan-400' : 'text-[var(--text-muted)]'}`}>24h</button>
            </div>
          </div>

          {/* Low-Stock Threshold */}
          <div className="cmp-item">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Low-Stock Threshold</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Alert when stock drops below this number</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-[var(--text-muted)]">Current:</span>
                <span className="text-xs font-medium text-amber-400">{threshold} units</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <input type="range" min={1} max={50} value={threshold} onChange={(e) => handleThreshold(parseInt(e.target.value))} className="w-28 accent-amber-500" />
                <span className="text-sm font-bold text-amber-400 w-8 text-right">{threshold}</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">
                {lowStockCount > 0 || criticalCount > 0
                  ? `${lowStockCount} low · ${criticalCount} out of stock`
                  : 'All products well-stocked'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card border-emerald-500/20">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Data & Backup</h2>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">All data is stored locally on this device. Export to back up or transfer between devices.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportData} className="btn-primary btn-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Export Data
            </button>
            <label className="btn-secondary btn-sm cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              Import Data
              <input type="file" accept=".json" className="hidden" onChange={importData} />
            </label>
          </div>
          {importStatus && <p className="text-xs text-emerald-500">{importStatus}</p>}
          <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3 mt-2">
            <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Storage Info</p>
            <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-secondary)]">
              <span>Products: {products.length}</span>
              <span>Low stock: {lowStockCount}</span>
              <span>Out of stock: {criticalCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card border-violet-500/20">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Security</h2>
        </div>
        <div className="space-y-3">
          <div className="cmp-item">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">App Lock Password</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {appLockEnabled
                  ? 'App lock is active. The app will lock when closed or reopened.'
                  : 'Require a password to open the app after closing it'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {appLockEnabled ? (
                <>
                  <span className="badge-emerald text-[10px]">Enabled</span>
                  <button onClick={handleRemoveAppPassword} className="btn-danger btn-sm text-xs">Remove</button>
                </>
              ) : (
                <button onClick={() => setShowAppPass(!showAppPass)} className="btn-primary btn-sm">
                  {showAppPass ? 'Cancel' : 'Set Password'}
                </button>
              )}
            </div>
          </div>

          {showAppPass && (
            <form onSubmit={handleSetAppPassword} className="p-3 bg-[var(--bg-surface2)] rounded-lg border border-violet-500/20 space-y-3">
              <p className="text-xs text-[var(--text-muted)]">Set a password that will be required to open the app after closing it.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">New Password *</label>
                  <input type="password" value={newAppPass} onChange={(e) => setNewAppPass(e.target.value)} className="input-field" placeholder="Min 4 characters" minLength={4} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Confirm Password *</label>
                  <input type="password" value={confirmAppPass} onChange={(e) => setConfirmAppPass(e.target.value)} className="input-field" placeholder="Re-enter password" required />
                </div>
              </div>
              <div className="border-t border-slate-200/30 dark:border-slate-700/30 pt-3">
                <p className="text-xs font-semibold text-cyan-400 mb-2">Password Recovery (Required)</p>
                <p className="text-xs text-[var(--text-muted)] mb-3">Set a security question so you can recover your password if you forget it. Your answer is stored securely (hashed).</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Security Question *</label>
                    <select value={securityQ} onChange={(e) => setSecurityQ(e.target.value)} className="select-field" required>
                      <option value="">Choose a question...</option>
                      <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                      <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                      <option value="What city were you born in?">What city were you born in?</option>
                      <option value="What is your favorite book?">What is your favorite book?</option>
                      <option value="What was the make of your first car?">What was the make of your first car?</option>
                      <option value="What primary school did you attend?">What primary school did you attend?</option>
                      <option value="Custom question">Custom question...</option>
                    </select>
                  </div>
                  {securityQ === 'Custom question' && (
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Your custom question *</label>
                      <input type="text" value={securityQ === 'Custom question' ? '' : securityQ} onChange={(e) => setSecurityQ(e.target.value)} className="input-field" placeholder="e.g. What is my shop's name?" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Security Answer *</label>
                    <input type="text" value={securityA} onChange={(e) => setSecurityA(e.target.value)} className="input-field" placeholder="Your answer (case-insensitive)" required />
                  </div>
                </div>
              </div>
              {appPassError && <p className="text-xs text-red-400">{appPassError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={appPassLoading} className="btn-primary btn-sm">
                  {appPassLoading ? 'Setting...' : 'Enable App Lock'}
                </button>
                <button type="button" onClick={() => setShowAppPass(false)} className="btn-ghost text-xs">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Account */}
      <div className="card border-violet-500/20">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Account</h2>
        </div>            <div className="cmp-item">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
              {profile?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{profile?.fullName || 'User'}</p>
              <p className="text-xs text-[var(--text-muted)]">{profile?.email} · {profile?.role}</p>
              <p className="text-xs text-[var(--text-muted)]">User ID: {userId?.slice(0, 8)}...</p>
            </div>
          </div>
          <button onClick={() => signOut()} className="btn-danger btn-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
