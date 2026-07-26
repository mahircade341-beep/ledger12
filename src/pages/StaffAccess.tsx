import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function StaffAccess() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeList, setStoreList] = useState<{storeName: string}[]>([]);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);

  // If already signed in, redirect to POS
  useEffect(() => {
    if (isAuthenticated) navigate('/pos', { replace: true });
  }, [isAuthenticated, navigate]);

  // Fetch available stores from profiles table for autocomplete
  useEffect(() => {
    async function fetchStores() {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('store_name')
          .not('store_name', 'eq', '')
          .not('staff_password', 'eq', '');
        if (profiles) {
          const stores = profiles
            .filter(p => p.store_name)
            .map(p => ({ storeName: p.store_name }));
          setStoreList(stores);
        }
      } catch {
        // query might fail silently
      }
    }
    fetchStores();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !staffPassword.trim()) {
      setError('Enter store name and staff password');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Look up the store in the profiles table
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('store_name', storeName.trim())
        .single();

      if (profileError || !profiles) {
        setError('Store not found. Check the store name or ask the owner to set up staff access.');
        setLoading(false);
        return;
      }

      // Verify staff password
      if (profiles.staff_password !== staffPassword) {
        setError('Incorrect staff password');
        setLoading(false);
        return;
      }

      // Store staff session in localStorage
      const staffSession = {
        storeName: profiles.store_name,
        storeOwnerId: profiles.user_id,
        role: 'staff',
        timestamp: Date.now(),
      };
      localStorage.setItem('dl-staff-session', JSON.stringify(staffSession));
      localStorage.setItem('dl-store-name', profiles.store_name);
      localStorage.setItem('dl-staff-auth', JSON.stringify({ storeName: profiles.store_name, role: 'staff' }));

      navigate('/pos', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Failed to access store. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-3xl shadow-2xl shadow-amber-500/25 mb-4 ring-1 ring-amber-400/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Staff Access</h1>
          <p className="text-slate-500 text-sm mt-1">Enter your store name and staff password</p>
        </div>

        <div className="glass-strong rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Store Name</label>
              <div className="relative">
                <input type="text" value={storeName} onChange={(e) => { setStoreName(e.target.value); setShowStoreDropdown(true); }}
                  className="glass-input w-full" placeholder="e.g. Mama Mboga Shop" autoFocus
                  onFocus={() => storeList.length > 0 && setShowStoreDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStoreDropdown(false), 200)} />
                {showStoreDropdown && storeList.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                    {storeList
                      .filter(s => s.storeName.toLowerCase().includes(storeName.toLowerCase()))
                      .slice(0, 8)
                      .map((s, i) => (
                        <button key={i} type="button"
                          onMouseDown={() => { setStoreName(s.storeName); setShowStoreDropdown(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left text-slate-300 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                          </svg>
                          <span className="font-medium">{s.storeName}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Staff Password</label>
              <input type="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)}
                className="glass-input w-full" placeholder="Enter staff password" />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 text-center">{error}</div>
            )}

            <button type="submit" disabled={loading || !storeName.trim() || !staffPassword.trim()} className="btn-primary w-full py-3">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg> Access Store</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <Link to="/login" className="text-xs text-slate-500 hover:text-amber-400 transition-colors">
              Store owner? Sign in here
            </Link>
          </div>
        </div>

        <div className="mt-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-xs font-medium text-slate-300">What is Staff Access?</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Staff can use POS, Stock, Daftari, and Cash Drawer without needing a full account.
                The store owner sets up staff access in Settings and shares the store name + staff password with employees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
