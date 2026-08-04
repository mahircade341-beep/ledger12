import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../App';

const ROUTE_TITLES: Record<string, string> = {
  '/home': 'Home',
  '/pos': 'POS',
  '/inventory': 'Catalog',
  '/daftari': 'Daftari',
  '/cash-drawer': 'Cash Drawer',
  '/insights': 'Reports',
  '/ai-insights': 'AI Insights',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const storeName = profile?.storeName || localStorage.getItem('dl-store-name') || 'DukaHub';
  const pageTitle = ROUTE_TITLES[location.pathname] || storeName;

  return (
    <header className="studio-topbar fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-2.5" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/settings')} className="topbar-pill">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.5a1.75 1.75 0 013.04 0l.79 1.37c.25.43.74.68 1.26.63l1.58-.15a1.75 1.75 0 011.68 2.4l-.58 1.48a1.5 1.5 0 00.66 1.9l1.37.8a1.75 1.75 0 01-.1 3l-1.46.6a1.5 1.5 0 00-.9 1.53l.2 1.57a1.75 1.75 0 01-2.33 1.83l-1.43-.6a1.5 1.5 0 00-1.58.28l-1.12 1.1a1.75 1.75 0 01-2.89-.85l-.52-1.49a1.5 1.5 0 00-1.26-1l-1.57-.1a1.75 1.75 0 01-1.45-2.62l.88-1.32a1.5 1.5 0 00-.3-1.98l-1.24-1a1.75 1.75 0 011.2-3.04l1.56.16c.51.05 1-.22 1.24-.68l.7-1.42zM12 15a3 3 0 100-6 3 3 0 000 6z" /></svg>
          Free Plan
        </button>
      </div>
      <h1 className="text-sm font-bold text-white truncate max-w-[140px] text-center">{pageTitle}</h1>
      <div className="flex items-center gap-0.5">
        <button onClick={() => navigate('/ai-insights')} className="p-2 rounded-xl text-[var(--nav-text)] hover:bg-[var(--nav-hover-bg)] hover:text-white transition-all" title="AI Insights" aria-label="AI Insights">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button onClick={toggleTheme} className="theme-toggle-btn p-2 rounded-xl text-[var(--nav-text)] hover:text-white hover:bg-[var(--nav-hover-bg)] transition-all" title="Toggle theme" aria-label="Toggle theme">
          <span className={`theme-toggle-icon ${theme === 'dark' ? 'entering-light' : 'entering-dark'}`}>
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </header>
  );
}
