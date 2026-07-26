import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LockScreen({ children }: { children: React.ReactNode }) {
  const { isLocked, appLockEnabled, verifyAppPassword, verifySecurityAnswer, lock } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showContent, setShowContent] = useState(!isLocked);
  const [showForgot, setShowForgot] = useState(false);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const securityQuestion = localStorage.getItem('dl-security-q') || '';

  // Check if app lock is enabled on mount
  useEffect(() => {
    if (appLockEnabled) {
      const shouldLock = localStorage.getItem('dl-locked') === 'true';
      if (shouldLock) {
        setShowContent(false);
      } else {
        setShowContent(true);
      }
    } else {
      setShowContent(true);
    }
  }, [appLockEnabled]);

  // Inactivity timer
  useEffect(() => {
    if (!isLocked) return;
    let timer: any;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { lock(); }, 5 * 60 * 1000);
    };
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [isLocked]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) { setError('Enter your app lock password'); return; }
    const valid = await verifyAppPassword(password);
    if (valid) {
      setShowContent(true);
      setPassword('');
      setError('');
      localStorage.removeItem('dl-locked');
    } else {
      setError('Incorrect password');
    }
  };

  const handleVerifySecurityAnswer = async () => {
    if (!securityAnswer.trim()) { setError('Enter your security answer'); return; }
    setLoading(true);
    const valid = await verifySecurityAnswer(securityAnswer);
    if (valid) {
      setResetMode(true);
      setError('');
    } else {
      setError('Incorrect answer');
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 4) { setError('Password must be at least 4 characters'); return; }
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(newPassword + '-applock'));
    const hashStr = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('dl-app-lock-hash', hashStr);
    localStorage.removeItem('dl-locked');
    setShowContent(true);
    setPassword('');
    setError('');
    setShowForgot(false);
    setResetMode(false);
    setLoading(false);
  };

  const resetAndGoBack = () => {
    setShowForgot(false);
    setResetMode(false);
    setError('');
    setSecurityAnswer('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  if (!showContent) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617] p-4">
        <div className="fixed inset-0 bg-[radial-gradient(rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08)_0%,transparent_60%)]" />
        <div className="w-full max-w-sm relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-4xl shadow-2xl shadow-amber-500/20 mb-4 ring-1 ring-amber-500/20">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">DukaLedger</h1>
            <p className="text-sm text-slate-500 mt-1">App is locked — enter your password</p>
          </div>

          {!showForgot ? (
            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field text-center text-lg py-3"
                  placeholder="App lock password"
                  autoFocus
                />
              </div>
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 text-center">{error}</div>
              )}
              <button type="submit" className="btn-primary w-full text-base py-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a1.5 1.5 0 10-3 0v3.75m-2.25 8.25h7.5a2.25 2.25 0 002.25-2.25v-6a2.25 2.25 0 00-2.25-2.25h-7.5a2.25 2.25 0 00-2.25 2.25v6a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Unlock
              </button>
              {securityQuestion && (
                <button type="button" onClick={() => { setShowForgot(true); setError(''); }} className="w-full text-xs text-[var(--text-muted)] hover:text-cyan-400 transition-colors py-1">
                  Forgot password?
                </button>
              )}
            </form>
          ) : !resetMode ? (
            <div className="space-y-4">
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                <p className="text-xs text-cyan-400/80 text-center mb-3">Answer your security question to reset the app lock.</p>
                <p className="text-sm font-medium text-[var(--text-primary)] text-center">{securityQuestion}</p>
              </div>
              <div>
                <input
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  className="input-field text-center text-lg py-3"
                  placeholder="Your answer"
                  autoFocus
                />
              </div>
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 text-center">{error}</div>
              )}
              <button onClick={handleVerifySecurityAnswer} className="btn-primary w-full text-base py-3" disabled={loading || !securityAnswer.trim()}>
                {loading ? 'Verifying...' : 'Verify Answer'}
              </button>
              <button type="button" onClick={resetAndGoBack} className="w-full text-xs text-[var(--text-muted)] hover:text-cyan-400 transition-colors py-1">
                Back to password
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <svg className="w-6 h-6 text-emerald-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-emerald-400 text-center">Answer correct. Set a new app lock password below.</p>
              </div>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field text-center py-3" placeholder="New password (min 4 chars)" autoFocus />
              <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="input-field text-center py-3" placeholder="Confirm new password" />
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 text-center">{error}</div>
              )}
              <button onClick={handleResetPassword} className="btn-primary w-full text-base py-3" disabled={loading || !newPassword || !confirmNewPassword}>
                {loading ? 'Resetting...' : 'Reset Password & Unlock'}
              </button>
            </div>
          )}

          <p className="text-center text-xs text-[var(--text-muted)] mt-6">
            Set or change your app lock password in Settings
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
