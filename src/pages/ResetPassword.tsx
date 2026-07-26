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
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-md">
        <div className="glass-strong rounded-2xl p-6 shadow-xl">
          <h1 className="text-xl font-bold text-slate-100 text-center mb-2">Reset Your Password</h1>
          <p className="text-sm text-slate-400 text-center mb-6">Enter your new password below</p>

          {success ? (
            <div className="text-center space-y-4">
              <svg className="w-12 h-12 text-emerald-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-emerald-400 font-medium">Password updated successfully!</p>
              <button onClick={() => navigate('/login')} className="btn-primary w-full py-3">Go to Sign In</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">New Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full" placeholder="Min 6 characters" minLength={6} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="glass-input w-full" placeholder="Re-enter new password" />
              </div>
              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
