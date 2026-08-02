import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, isAuthenticated } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (isAuthenticated && success) navigate('/pos', { replace: true });
  }, [isAuthenticated, success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    const result = await updatePassword(password);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-v2-pattern">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      {/* Glow orbs */}
      <div className="absolute w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(59,130,246,0.04)', top: '15%', left: '5%' }} />
      <div className="absolute w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(59,130,246,0.03)', bottom: '10%', right: '10%' }} />

      <div className="w-full max-w-md relative z-10 animate-slide-up-v2">
        {/* V2 Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-2xl mb-4"
            style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--btn-primary-shadow)' }}>
            <span className="text-2xl font-extrabold text-white">D</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Reset Your Password</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Enter your new password below</p>
        </div>

        <div className="glass-v2-strong rounded-2xl p-5 sm:p-6">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 animate-scale-in-v2">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-emerald-400 font-medium">Password updated successfully!</p>
              <button onClick={() => navigate('/login')} className="btn-v2-primary w-full py-3">
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">New Password <span className="text-[var(--accent-primary)]">*</span></label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="input-v2 w-full pr-10" placeholder="Min 6 characters" minLength={6} autoFocus />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      {showPass ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      ) : (
                        <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Confirm Password <span className="text-[var(--accent-primary)]">*</span></label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-v2 w-full" placeholder="Re-enter new password" />
              </div>
              {error && <div className="alert-v2-error text-sm">{error}</div>}
              <button type="submit" disabled={loading} className="btn-v2-primary w-full py-3">
                {loading ? <div className="spinner-v2 mx-auto" /> : 'Update Password'}
              </button>
              <button type="button" onClick={() => navigate('/login')}
                className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-accent)] transition-colors py-1">
                ← Back to sign in
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-5 font-medium tracking-wide">
          DukaHub <span className="text-[var(--text-accent)]">v2</span> · Free for Kenyan shops
        </p>
      </div>
    </div>
  );
}
