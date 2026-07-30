import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LockScreen from './components/LockScreen';
import Layout from './components/Layout';
import Login from './pages/Login';
import POS from './pages/POS';
import Stock from './pages/Stock';
import Daftari from './pages/Daftari';
import CashDrawer from './pages/CashDrawer';
import Insights from './pages/Insights';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';

type Theme = 'dark' | 'light';
interface ThemeCtx { theme: Theme; toggleTheme: () => void }
const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isProfileLoaded, appLockEnabled, needsOnboarding } = useAuth();
  const location = useLocation();

  // Redirect to onboarding only after profile is loaded (prevents flash on refresh)
  if (!isLoading && isProfileLoaded && isAuthenticated && needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // Auto-lock on tab close/reopen
  useEffect(() => {
    if (!appLockEnabled) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem('dl-locked', 'true');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', () => {
      localStorage.setItem('dl-locked', 'true');
    });
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', () => {});
    };
  }, [appLockEnabled]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <LockScreen>{children}</LockScreen>;
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('dl-theme') as Theme) || 'dark');
  const [themeRipple, setThemeRipple] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('light', theme === 'light');
    html.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('dl-theme', theme);

    // Add transition class for smooth animation, remove after animation completes
    html.classList.add('theme-transitioning');
    const timeout = setTimeout(() => {
      html.classList.remove('theme-transitioning');
    }, 400);

    // Theme ripple effect
    setThemeRipple(true);
    setTimeout(() => setThemeRipple(false), 600);

    return () => clearTimeout(timeout);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{background:'var(--body-bg)'}}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{color:'var(--text-muted)'}}>Loading DukaHub...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {themeRipple && <div className="theme-ripple" />}
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="pos" element={<POS />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="stock" element={<Stock />} />
          <Route path="daftari" element={<Daftari />} />
          <Route path="cash-drawer" element={<CashDrawer />} />
          <Route path="insights" element={<Insights />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeContext.Provider>
  );
}
