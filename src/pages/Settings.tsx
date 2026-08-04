import { useState } from 'react';
import { useTheme } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { useLocalData, genId } from '../hooks/useLocalData';

function fmtTime(ts: number) {
  const pref = localStorage.getItem('dl-time-format') || '12h';
  if (pref === '24h') return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut, userId, appLockEnabled, setAppPassword, removeAppPassword, updateStoreName } = useAuth();
  const { data: products, addAll: addAllProducts } = useLocalData('products');
  const { data: transactions, addAll: addAllTransactions } = useLocalData('transactions');
  const { data: debtors, addAll: addAllDebtors } = useLocalData('debtors');
  const { data: debtPayments, addAll: addAllDebtPayments } = useLocalData('debtPayments');
  const { data: payouts, addAll: addAllPayouts } = useLocalData('payouts');
  const { data: stockAdjustments, addAll: addAllStockAdjustments } = useLocalData('stockAdjustments');
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

  // Store Name Editor
  const [editStoreName, setEditStoreName] = useState('');
  const [showStoreNameEditor, setShowStoreNameEditor] = useState(false);
  const [storeNameSaving, setStoreNameSaving] = useState(false);
  const [storeNameError, setStoreNameError] = useState('');

  function EditStoreName() {
    const currentName = profile?.storeName || localStorage.getItem('dl-store-name') || 'DukaHub';

    const handleSave = async () => {
      if (!editStoreName.trim()) { setStoreNameError('Store name cannot be empty'); return; }
      setStoreNameSaving(true);
      setStoreNameError('');
      const result = await updateStoreName(editStoreName.trim());
      if (result.error) {
        setStoreNameError(result.error);
      } else {
        setShowStoreNameEditor(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
      setStoreNameSaving(false);
    };

    return (
      <div className="space-y-3">
        <div className="cmp-item">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Store Name</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              This name appears on receipts, the sidebar, and throughout the app
            </p>
          </div>
          {showStoreNameEditor ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={editStoreName}
                onChange={(e) => setEditStoreName(e.target.value)}
                className="input-v2 w-40 text-sm"
                placeholder="Your store name"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowStoreNameEditor(false); }}
              />
              <button onClick={handleSave} disabled={storeNameSaving} className="btn-v2-primary text-xs h-8">
                {storeNameSaving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowStoreNameEditor(false)} className="btn-v2-secondary text-xs h-8">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--accent-primary)]">{currentName}</span>
              <button onClick={() => { setEditStoreName(currentName); setShowStoreNameEditor(true); setStoreNameError(''); }} className="btn-ghost p-1.5 hover:text-[var(--accent-primary)] transition-colors" title="Edit store name" aria-label="Edit store name">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {storeNameError && <p className="text-xs text-[var(--color-danger)]">{storeNameError}</p>}
        {!showStoreNameEditor && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-[var(--text-muted)]">Receipt preview:</span>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm">
              <span className="text-[10px] font-bold text-[var(--text-primary)]">{currentName}</span>
              <span className="text-[8px] text-[var(--text-muted)]">· Receipt</span>
            </div>
          </div>
        )}
      </div>
    );
  }

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
    const payload = {
      app: 'dukahub',
      version: '10.0.0',
      exportedAt: new Date().toISOString(),
      storeName: profile?.storeName || localStorage.getItem('dl-store-name') || 'DukaHub',
      tables: { products, transactions, debtors, debtPayments, payouts, stockAdjustments },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `dukahub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const escapeCsv = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const exportCsv = () => {
    const headers = ['Date', 'Time', 'Receipt', 'Payment', 'Items', 'Total', 'Discount', 'Debtor'];
    const rows = transactions.map((t: any) => ({
      Date: new Date(t._creationTime).toLocaleDateString('en-KE'),
      Time: fmtTime(t._creationTime),
      Receipt: (t._id || '').slice(-8).toUpperCase(),
      Payment: t.paymentMethod,
      Items: (t.items || []).map((i: any) => `${i.name} x${i.quantity}`).join(' | '),
      Total: t.total,
      Discount: t.discount || 0,
      Debtor: t.debtorName || '',
    }));
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escapeCsv((r as any)[h])).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `dukahub-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
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
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const t = parsed?.tables || parsed;
        const pick = (key: string, legacy: string): any[] => {
          const arr = t[key] ?? t[legacy];
          return Array.isArray(arr)
            ? arr.map((r: any) => ({ ...r, userId: userId as any, _id: r._id || genId(), _creationTime: r._creationTime || Date.now() }))
            : [];
        };
        const tables: { rows: any[]; add: (items: any[]) => void }[] = [
          { rows: pick('products', 'dl-products'), add: addAllProducts },
          { rows: pick('transactions', 'dl-transactions'), add: addAllTransactions },
          { rows: pick('debtors', 'dl-debtors'), add: addAllDebtors },
          { rows: pick('debtPayments', 'dl-debt-payments'), add: addAllDebtPayments },
          { rows: pick('payouts', 'dl-payouts'), add: addAllPayouts },
          { rows: pick('stockAdjustments', 'dl-stock-adjustments'), add: addAllStockAdjustments },
        ];
        let count = 0;
        tables.forEach((m) => { if (m.rows.length > 0) { m.add(m.rows); count++; } });
        setImportStatus(count > 0 ? `Imported ${count} tables — saved on this device and queued for cloud backup` : 'No data found in that file');
        setTimeout(() => setImportStatus(''), 6000);
      } catch { setImportStatus('Invalid file'); setTimeout(() => setImportStatus(''), 3000); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* V10 header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage app preferences and data</p>
        </div>
        {saved && <span className="badge-v2-success animate-fade-in">Saved</span>}
      </div>

      {/* Premium plans */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-[#FFD60A]" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.5a1.75 1.75 0 013.04 0l.79 1.37c.25.43.74.68 1.26.63l1.58-.15a1.75 1.75 0 011.68 2.4l-.58 1.48a1.5 1.5 0 00.66 1.9l1.37.8a1.75 1.75 0 01-.1 3l-1.46.6a1.5 1.5 0 00-.9 1.53l.2 1.57a1.75 1.75 0 01-2.33 1.83l-1.43-.6a1.5 1.5 0 00-1.58.28l-1.12 1.1a1.75 1.75 0 01-2.89-.85l-.52-1.49a1.5 1.5 0 00-1.26-1l-1.57-.1a1.75 1.75 0 01-1.45-2.62l.88-1.32a1.5 1.5 0 00-.3-1.98l-1.24-1a1.75 1.75 0 011.2-3.04l1.56.16c.51.05 1-.22 1.24-.68l.7-1.42zM12 15a3 3 0 100-6 3 3 0 000 6z" /></svg>
            DukaHub Premium
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Plan status</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`plan-card ${true ? 'plan-card-recommended' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-extrabold text-white">Free</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#FF3B30,#FF9500)' }}>Your plan</span>
            </div>
            <p className="text-2xl font-extrabold text-white">KES 0</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 mb-3">Everything you use today — unlimited products, POS, Daftari &amp; insights.</p>
            <button disabled className="w-full py-2.5 rounded-xl text-sm font-bold text-white/60 bg-[var(--bg-surface2)] cursor-default">Current plan</button>
          </div>
          <div className="plan-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-extrabold text-white">Pro</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#FFD60A] px-2 py-0.5 rounded-full bg-[#FFD60A]/15 border border-[#FFD60A]/30">Coming soon</span>
            </div>
            <p className="text-2xl font-extrabold text-white">Coming <span className="text-[var(--text-muted)]">soon</span></p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 mb-3">Priority sync, multi-device shops, CSV auto-exports and more — for power sellers.</p>
            <button onClick={() => alert('DukaHub Pro is coming soon — we will announce it right here!')} className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg,#FF3B30,#FF9500)', boxShadow: '0 4px 16px rgba(255,59,48,0.35)' }}>
              Notify me
            </button>
          </div>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] text-center">Honest pricing — DukaHub stays free for Kenyan shops, forever.</p>
      </div>

      {/* V10 Appearance card */}
      <div className="card-v2 border-blue-500/20">
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 to-blue-500/30 rounded-t-xl -mt-[1px] mx-auto" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Appearance</h2>
        </div>
        <div className="space-y-4">
          <div className="cmp-item">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Theme</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Switch between dark and light mode</p>
            </div>
            <button onClick={toggleTheme} className={`theme-toggle-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${theme === 'dark' ? 'bg-cyan-500/10 text-[var(--color-info)] border border-cyan-500/20 shadow-sm' : 'bg-slate-200 text-slate-700 border border-slate-300'}`}>
              <span className={`theme-toggle-icon ${theme === 'dark' ? 'entering-light' : 'entering-dark'}`}>
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
                )}
              </span>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* V10 Preferences card */}
      <div className="card-v2 border-cyan-500/20">
        <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 to-cyan-500/30 rounded-t-xl -mt-[1px] mx-auto" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Preferences</h2>
        </div>
        <div className="space-y-4">
          {/* Time Format */}
          <div className="cmp-item">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Time Format</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Display times in 12-hour or 24-hour format</p>
            </div>
            <div className="flex gap-1 bg-[var(--bg-surface2)] rounded-lg p-1">
              <button onClick={() => handleTimeFormat('12h')} className={`tab-v2 ${timeFormat === '12h' ? 'tab-v2-active' : ''}`}>12h</button>
              <button onClick={() => handleTimeFormat('24h')} className={`tab-v2 ${timeFormat === '24h' ? 'tab-v2-active' : ''}`}>24h</button>
            </div>
          </div>

          {/* Low-Stock Threshold */}
          <div className="cmp-item">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Low-Stock Threshold</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Alert when stock drops below this number</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-[var(--text-muted)]">Current:</span>
                <span className="text-xs font-medium text-[var(--color-warning)]">{threshold} units</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 p-1.5 bg-[var(--bg-surface2)] rounded-xl">
                <input type="range" min={1} max={50} value={threshold} onChange={(e) => handleThreshold(parseInt(e.target.value))} className="w-28 accent-amber-500" />
                <span className="text-sm font-bold text-[var(--color-warning)] w-8 text-right">{threshold}</span>
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

      {/* V10 Data Management card */}
      <div className="card-v2 border-emerald-500/20">
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 to-emerald-500/30 rounded-t-xl -mt-[1px] mx-auto" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Data & Backup</h2>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">Export a full backup or the sales ledger as a spreadsheet at any time.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportData} className="btn-v2-primary text-xs h-9">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Backup (JSON)
            </button>
            <button onClick={exportCsv} className="btn-v2-primary text-xs h-9">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M9 3.75v15m6-15v15" /></svg>
              Sales CSV
            </button>
            <label className="btn-v2-secondary text-xs h-9 cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              Import Backup
              <input type="file" accept=".json" className="hidden" onChange={importData} />
            </label>
          </div>
          {importStatus && <p className="text-xs text-[var(--color-success)]">{importStatus}</p>}
          <div className="divider-v2">
            <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Storage Info</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="badge-v2">Products: {products.length}</span>
            <span className="badge-v2">Sales: {transactions.length}</span>
            <span className="badge-v2-warning">Low: {lowStockCount}</span>
            <span className="badge-v2-danger">Out: {criticalCount}</span>
          </div>
        </div>
      </div>

      {/* V10 Security card */}
      <div className="card-v2 border-violet-500/20">
        <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 to-violet-500/30 rounded-t-xl -mt-[1px] mx-auto" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
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
                  <span className="badge-v2-success text-[10px]">Enabled</span>
                  <button onClick={handleRemoveAppPassword} className="btn-v2-danger text-xs h-8">Remove</button>
                </>
              ) : (
                <button onClick={() => setShowAppPass(!showAppPass)} className="btn-v2-primary text-xs h-8">
                  {showAppPass ? 'Cancel' : 'Set Password'}
                </button>
              )}
            </div>
          </div>

          {showAppPass && (
            <form onSubmit={handleSetAppPassword} className="p-3 bg-[var(--bg-surface2)] rounded-xl border border-violet-500/20 space-y-3">
              <p className="text-xs text-[var(--text-muted)]">Set a password that will be required to open the app after closing it.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">New Password <span className="text-[var(--accent-primary)]">*</span></label>
                  <input type="password" value={newAppPass} onChange={(e) => setNewAppPass(e.target.value)} className="input-v2 w-full" placeholder="Min 4 characters" minLength={4} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Confirm Password <span className="text-[var(--accent-primary)]">*</span></label>
                  <input type="password" value={confirmAppPass} onChange={(e) => setConfirmAppPass(e.target.value)} className="input-v2 w-full" placeholder="Re-enter password" required />
                </div>
              </div>
              <div className="divider-v2">
                <span className="text-xs font-semibold text-[var(--color-info)]">Password Recovery <span className="font-normal text-[var(--text-muted)]">(Required)</span></span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Set a security question so you can recover your password if you forget it. Your answer is stored securely (hashed).</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Security Question <span className="text-[var(--accent-primary)]">*</span></label>
                  <select value={securityQ} onChange={(e) => setSecurityQ(e.target.value)} className="input-v2 w-full" required>
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
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Your custom question <span className="text-[var(--accent-primary)]">*</span></label>
                    <input type="text" value={securityQ === 'Custom question' ? '' : securityQ} onChange={(e) => setSecurityQ(e.target.value)} className="input-v2 w-full" placeholder="e.g. What is my shop's name?" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Security Answer <span className="text-[var(--accent-primary)]">*</span></label>
                  <input type="text" value={securityA} onChange={(e) => setSecurityA(e.target.value)} className="input-v2 w-full" placeholder="Your answer (case-insensitive)" required />
                </div>
              </div>
              {appPassError && <p className="text-xs text-[var(--color-danger)]">{appPassError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={appPassLoading} className="btn-v2-primary text-xs h-9">
                  {appPassLoading ? 'Setting...' : 'Enable App Lock'}
                </button>
                <button type="button" onClick={() => setShowAppPass(false)} className="btn-v2-secondary text-xs h-9">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* V10 Store Profile card */}
      <div className="card-v2 border-blue-500/20">
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 to-blue-500/30 rounded-t-xl -mt-[1px] mx-auto" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614fM16.5 12V4.5l-3 3m0 0l-3-3m3 3V4.5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Store Profile</h2>
        </div>
        <EditStoreName />
      </div>

      {/* V10 Account card */}
      <div className="card-v2 border-violet-500/20">
        <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 to-violet-500/30 rounded-t-xl -mt-[1px] mx-auto" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Account</h2>
        </div>
        <div className="cmp-item">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-cyan-500 flex items-center justify-center text-lg font-bold text-white shadow-lg shrink-0">
              {profile?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{profile?.fullName || 'User'}</p>
              <p className="text-xs text-[var(--text-muted)]">{profile?.email} · <span className="badge-v2-info text-[10px]">{profile?.role}</span></p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">ID: <span className="font-mono">{userId?.slice(0, 8)}...</span></p>
            </div>
          </div>
          <button onClick={() => signOut()} className="btn-v2-danger text-xs h-9">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
