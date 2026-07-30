import { NavLink, useLocation } from 'react-router-dom';
import { useLocalData } from '../hooks/useLocalData';

const tabs = [
  {
    path: '/pos',
    label: 'POS',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3h11.25M9 3v18m-5.25-3h12.75a.75.75 0 00.75-.75V6.75a.75.75 0 00-.75-.75H3.75A.75.75 0 003 6.75v10.5a.75.75 0 00.75.75z" />
      </svg>
    ),
  },
  {
    path: '/inventory',
    label: 'Stock',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    badge: 'inventory',
  },
  {
    path: '/daftari',
    label: 'Daftari',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    path: '/insights',
    label: 'Reports',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    path: '/settings',
    label: 'More',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function BottomTabBar() {
  const location = useLocation();
  const { data: products } = useLocalData('products');
  const lowStockThreshold = parseInt(localStorage.getItem('dl-low-stock-threshold') || '5');
  const lowStockCount = products.filter((p: any) => p.quantity > 0 && p.quantity <= lowStockThreshold).length;
  const criticalCount = products.filter((p: any) => p.quantity <= 0).length;
  const totalAlerts = lowStockCount + criticalCount;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="glass-v2-nav rounded-t-2xl border-t border-[var(--border-color)] shadow-lg backdrop-blur-2xl">
        <div className="flex items-center justify-around px-2 py-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
            const showBadge = tab.badge === 'inventory' && totalAlerts > 0;

            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-[var(--brand)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <div className="relative">
                  {tab.icon(isActive)}
                  {showBadge && (
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[var(--bg-primary)] animate-pulse" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold leading-tight ${
                  isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'
                }`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[var(--brand)]" />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
