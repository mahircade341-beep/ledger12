import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LockScreen from './components/LockScreen';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import POS from './pages/POS';
import Stock from './pages/Stock';
import Daftari from './pages/Daftari';
import CashDrawer from './pages/CashDrawer';
import Insights from './pages/Insights';
import Premium from './pages/Premium';
import Settings from './pages/Settings';
import Categories from './pages/Categories';
import ResetPassword from './pages/ResetPassword';

type Theme = 'dark' | 'light';
interface ThemeCtx { theme: Theme; toggleTheme: () => void }
const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, appLockEnabled } = useAuth();

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
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
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

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('dl-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm animate-pulse">Loading DukaHub...</p>
        </div>
      </div>
    );
  }

  // If authenticated, redirect to POS app
  const landingOrRedirect = isAuthenticated ? <Navigate to="/pos" replace /> : <Landing />;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <Routes>
        <Route path="/" element={landingOrRedirect} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="pos" element={<POS />} />
          <Route path="stock" element={<Stock />} />
          <Route path="daftari" element={<Daftari />} />
          <Route path="cash-drawer" element={<CashDrawer />} />
          <Route path="insights" element={<Insights />} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings" element={<Settings />} />
          <Route path="premium" element={<Premium />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeContext.Provider>
  );
}
