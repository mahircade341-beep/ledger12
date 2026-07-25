import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LockScreen({ children }: { children: React.ReactNode }) {
  const { isLocked, unlock, lock } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showContent, setShowContent] = useState(!isLocked);

  // Inactivity timer
  useEffect(() => {
    if (!isLocked) return;
    let timer: any;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        lock();
      }, 5 * 60 * 1000); // 5 minutes
    };
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [isLocked]);

  useEffect(() => {
    if (isLocked) {
      setShowContent(false);
    }
  }, [isLocked]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) { setError('Enter your password'); return; }
    const success = unlock(password);
    if (success) {
      setShowContent(true);
      setPassword('');
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (!showContent) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-full max-w-sm p-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-4xl shadow-2xl shadow-cyan-500/20 mb-4">
              🔒
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">DukaLedger</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Session Locked — Enter password to unlock</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field text-center text-lg py-3"
                placeholder="Your password"
                autoFocus
              />
            </div>
            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 text-center">{error}</div>}
            <button type="submit" className="btn-primary w-full text-base py-3">Unlock</button>
          </form>
          <p className="text-center text-xs text-[var(--text-muted)] mt-6">Use the same password you signed in with</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
