import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LockScreen from './components/LockScreen';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import { TermsPage, PrivacyPage } from './pages/LegalPages';
import Login from './pages/Login';
import POS from './pages/POS';
import Stock from './pages/Stock';
import Daftari from './pages/Daftari';
import CashDrawer from './pages/CashDrawer';
import Insights from './pages/Insights';
import AiInsights from './pages/AiInsights';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import useAnalytics from './hooks/useAnalytics';

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

// Per-route SEO metadata: titles + descriptions so tabs, history, social shares,
// and rendered search results show accurate page name and keyword-rich copy.
interface RouteMeta {
  title: string;
  description: string;
}

const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: 'DukaHub — Free POS & Inventory App for Kenyan Shops',
    description: 'Free POS, inventory & Daftari debtor ledger for Kenyan shops. Track every shilling — sales, stock, M-Pesa & cash — from your phone. No card required.',
  },
  '/login': {
    title: 'Sign In · DukaHub',
    description: 'Sign in to DukaHub to manage your shop — POS, inventory, Daftari and sales insights. Free for Kenyan shops, no card required.',
  },
  '/terms': {
    title: 'Terms of Service · DukaHub',
    description: 'The terms that govern your use of DukaHub, the free POS and retail management app for Kenyan shops.',
  },
  '/privacy': {
    title: 'Privacy Policy · DukaHub',
    description: 'How DukaHub protects your shop data — encrypted login, row-level security, and full data ownership. Compliant with the Kenya Data Protection Act.',
  },
  '/pos': {
    title: 'Point of Sale (POS) for Kenyan Shops · DukaHub',
    description: 'Fast, keyboard-first point of sale for Kenyan shops. Barcode scanning, instant receipts, and automatic stock deduction at every sale.',
  },
  '/inventory': {
    title: 'Inventory Management for Kenyan Shops · DukaHub',
    description: 'Track stock levels in real time, get low-stock alerts, and know exactly what to reorder with DukaHub inventory management.',
  },
  '/stock': {
    title: 'Stock Management & Margins · DukaHub',
    description: 'Manage products, wholesale prices and profit margins in one place. Simple stock management for Kenyan dukas.',
  },
  '/daftari': {
    title: 'Daftari — Debtor Ledger for Kenyan Shops · DukaHub',
    description: 'Track customers who buy on credit, record payments, and keep a full Daftari history of who owes you — no more torn notebook pages.',
  },
  '/cash-drawer': {
    title: 'Cash Drawer Audit · DukaHub',
    description: 'Reconcile your cash drawer automatically — M-Pesa, cash and float. Every shilling accounted for, every day.',
  },
  '/insights': {
    title: 'Sales Insights & Reports · DukaHub',
    description: 'Daily sales, profit margins and cash audits without spreadsheets. Know what you actually earned with DukaHub insights.',
  },
  '/ai-insights': {
    title: 'AI Shop Analysis · DukaHub',
    description: 'Get plain-language AI insights about your shop — top products, slow-moving stock, profit trends, and what to fix first.',
  },
  '/analytics': {
    title: 'Shop Analytics Dashboard · DukaHub',
    description: 'Analytics dashboard for your Kenyan shop: sales trends, revenue and performance — every shilling, in one view.',
  },
  '/settings': {
    title: 'Settings · DukaHub',
    description: 'Manage your DukaHub shop settings, profile and preferences.',
  },
  '/reset-password': {
    title: 'Reset Password · DukaHub',
    description: 'Reset your DukaHub account password securely and get back to running your shop.',
  },
  '/onboarding': {
    title: 'Welcome to DukaHub',
    description: 'Set up your DukaHub shop in under a minute — free forever, no card required.',
  },
};

/**
 * SeoTracker — fires a page_view on every route change (dataLayer + Supabase)
 * and keeps document.title + meta description in sync with the current page
 * so search engines and social crawlers see per-page metadata.
 */
function SeoTracker() {
  const location = useLocation();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    const meta = ROUTE_META[location.pathname] || ROUTE_META['/'];

    if (document.title !== meta.title) document.title = meta.title;

    let descEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descEl) {
      descEl = document.createElement('meta');
      descEl.name = 'description';
      document.head.appendChild(descEl);
    }
    if (descEl.content !== meta.description) descEl.content = meta.description;

    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogTitle) ogTitle.content = meta.title;
    if (ogDesc) ogDesc.content = meta.description;

    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search, trackPageView]);

  return null;
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
      <SeoTracker />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
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
          <Route path="ai-insights" element={<AiInsights />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeContext.Provider>
  );
}
