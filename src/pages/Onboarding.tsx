import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, needsOnboarding, completeProfile } = useAuth();

  // Synchonous check — redirect immediately if already onboarded before any render
  if (localStorage.getItem('dl-onboarded') === 'true') {
    navigate('/pos', { replace: true });
    return null;
  }

  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [businessType, setBusinessType] = useState<'retail' | 'wholesale'>('retail');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill name from Google profile (user_metadata)
  useEffect(() => {
    if (user?.user_metadata) {
      const googleName = user.user_metadata.full_name || user.user_metadata.name || '';
      if (googleName) setFullName(googleName);
    }
  }, [user]);

  // If profile is already complete or already onboarded, redirect to POS
  useEffect(() => {
    if (localStorage.getItem('dl-onboarded') === 'true' || (!needsOnboarding && profile?.storeName)) {
      navigate('/pos', { replace: true });
    }
  }, [needsOnboarding, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !storeName.trim()) {
      setError('Both fields are required');
      return;
    }
    setLoading(true);
    const result = await completeProfile(fullName.trim(), storeName.trim(), businessType);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setLoading(false);
    localStorage.setItem('dl-onboarded', 'true');
    navigate('/pos', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}>
      {/* Background orbs */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at top, rgba(245,158,11,0.06) 0%, transparent 60%)'
      }} />
      <div className="absolute w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(245,158,11,0.05)', top: '15%', left: '5%' }} />
      <div className="absolute w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(244,63,94,0.05)', bottom: '10%', right: '10%' }} />

      <div className="w-full max-w-md relative z-10">
        {/* V2 Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-blue-500 shadow-lg shadow-[var(--accent-primary)]/25 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Welcome to DukaHub!
          </h1>
          <p className="text-sm mt-1 text-[var(--text-muted)]">
            Just a couple more details to set up your store
          </p>
        </div>

        {/* V2 Form card */}
        <div className="glass-v2-strong rounded-2xl p-6 shadow-xl border border-[var(--border-color)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-v2 w-full"
                placeholder="Your full name"
                autoFocus
              />
            </div>

            {/* Store Name */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Store Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="input-v2 w-full"
                placeholder="e.g. Mama's Shop"
              />
              <p className="text-xs mt-1.5 text-[var(--text-muted)]">
                This will appear as your store's name throughout the app
              </p>
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Business Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBusinessType('retail')}
                  className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                    businessType === 'retail'
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-dim)] shadow-sm'
                      : 'border-[var(--border-color)] bg-[var(--item-bg)] hover:border-[var(--accent-primary)]/50'
                  }`}
                >
                  <div className="text-2xl mb-1">🏪</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Retail</div>
                  <div className="text-xs mt-0.5 text-[var(--text-muted)]">Sell to end customers</div>
                </button>
                <button
                  type="button"
                  onClick={() => setBusinessType('wholesale')}
                  className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                    businessType === 'wholesale'
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-dim)] shadow-sm'
                      : 'border-[var(--border-color)] bg-[var(--item-bg)] hover:border-[var(--accent-primary)]/50'
                  }`}
                >
                  <div className="text-2xl mb-1">📦</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Wholesale</div>
                  <div className="text-xs mt-0.5 text-[var(--text-muted)]">Sell in bulk to retailers</div>
                </button>
              </div>
            </div>

            {error && (
              <div className="alert-v2 p-3 border-red-500/20 bg-red-500/5 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-v2-primary w-full py-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                'Complete Setup'
              )}
            </button>
          </form>

          <p className="text-xs text-center mt-4 text-[var(--text-muted)]">
            Signed in as <span className="text-[var(--text-secondary)]">{user?.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
