import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signIn, resetPassword, isAuthenticated, signInWithGoogle } = useAuth();

  // Tab: signin | signup | reset
  const [tab, setTab] = useState<'signin' | 'signup'>(() => (searchParams.get('mode') === 'signup' ? 'signup' : 'signin'));
  const [showReset, setShowReset] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate('/pos', { replace: true });
  }, [isAuthenticated, navigate]);

  // Handle sign up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim() || !fullName.trim() || !storeName.trim()) {
      setError('All fields are required');
      return;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);

    const result = await signUp(email.trim(), password, fullName.trim(), storeName.trim());
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccessMsg('Account created! Check your email for the confirmation link, then sign in below.');
    setTab('signin');
    setLoading(false);
  };

  // Handle sign in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) { setError('Email and password are required'); return; }
    setLoading(true);

    const result = await signIn(email.trim(), password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  // Handle password reset request
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email.trim()) { setError('Enter your email address'); return; }
    setLoading(true);

    const result = await resetPassword(email.trim());
    if (result.error) {
      setError(result.error);
    } else {
      setSuccessMsg('Check your email for the password reset link');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.06)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-3xl pointer-events-none"
        style={{ top: '20%', left: '10%', transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)`, transition: 'transform 0.3s ease-out' }} />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-rose-500/5 blur-3xl pointer-events-none"
        style={{ bottom: '10%', right: '10%', transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)`, transition: 'transform 0.3s ease-out' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-3xl shadow-2xl shadow-amber-500/20 mb-4 ring-1 ring-white/10"
            style={{ transform: `perspective(1000px) rotateY(${mousePos.x * 5}deg) rotateX(${mousePos.y * -5}deg)`, transition: 'transform 0.2s ease-out' }}>
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3h11.25M9 3v18m-5.25-3h12.75a.75.75 0 00.75-.75V6.75a.75.75 0 00-.75-.75H3.75A.75.75 0 003 6.75v10.5a.75.75 0 00.75.75z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">DukaHub</h1>
          <p className="text-slate-500 text-sm mt-1">Cloud-powered retail management for Kenyan shops</p>
        </div>

        <div className="glass-strong rounded-2xl p-6 shadow-xl">
          {showReset ? (
            /* ── Password Reset ── */
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-100 text-center">Reset Password</h2>
              <p className="text-sm text-slate-400 text-center">Enter your email and we'll send you a reset link</p>
              <form onSubmit={handleResetRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="glass-input w-full" placeholder="you@example.com" autoFocus />
                </div>
                {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                {successMsg && <p className="text-sm text-emerald-400 text-center">{successMsg}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Send Reset Link'}
                </button>
              </form>
              <button onClick={() => { setShowReset(false); setError(''); setSuccessMsg(''); }} className="w-full text-xs text-slate-500 hover:text-amber-400 transition-colors py-1">
                ← Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Tab Switcher */}
              <div className="flex bg-white/5 rounded-lg p-1 mb-6 border border-white/10">
                <button onClick={() => { setTab('signin'); setError(''); }} className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${tab === 'signin' ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Sign In</button>
                <button onClick={() => { setTab('signup'); setError(''); }} className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${tab === 'signup' ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Sign Up</button>
              </div>

              {/* ── Google OAuth (visible on both tabs) ── */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#1E293B] px-3 text-slate-500">or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium transition-all hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {tab === 'signin' ? (
                <>
                  {/* ── Divider ── */}
                  <div className="relative mb-4 mt-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-[#1E293B] px-3 text-slate-500">or sign in with email</span>
                    </div>
                  </div>

                  {/* ── Sign In Form ── */}
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="glass-input w-full" placeholder="you@example.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                      <div className="relative">
                        <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                          className="glass-input w-full pr-10" placeholder="Enter your password" />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors">
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
                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    {successMsg && <p className="text-sm text-emerald-400 text-center">{successMsg}</p>}
                    <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                      {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Sign In'}
                    </button>
                    <button type="button" onClick={() => { setShowReset(true); setError(''); setSuccessMsg(''); }}
                      className="w-full text-xs text-slate-500 hover:text-amber-400 transition-colors">
                      Forgot password?
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* ── Divider ── */}
                  <div className="relative mb-4 mt-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-[#1E293B] px-3 text-slate-500">or sign up with email</span>
                    </div>
                  </div>

                  {/* ── Sign Up Form ── */}
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                          className="glass-input w-full" placeholder="Your name" autoFocus />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Store Name</label>
                        <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)}
                          className="glass-input w-full" placeholder="e.g. Mama's Shop" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="glass-input w-full" placeholder="you@example.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Password (min 6 chars)</label>
                      <div className="relative">
                        <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                          className="glass-input w-full pr-10" placeholder="Create a password" minLength={6} />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors">
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
                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    {successMsg && <p className="text-sm text-emerald-400 text-center">{successMsg}</p>}
                    <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                      {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Create Account'}
                    </button>
                    <p className="text-xs text-slate-500 text-center">
                      After signing up, check your email for the confirmation link.
                    </p>
                  </form>
                </>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-700 mt-4 font-medium tracking-wide">DukaHub v1.0</p>
      </div>
    </div>
  );
}
