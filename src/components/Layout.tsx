import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomTabBar from './BottomTabBar';
import MorePanel from './MorePanel';
import ToastAlerts from './ToastAlerts';

export default function Layout() {
  const [moreOpen, setMoreOpen] = useState(false);

  // Listen for "More" tab clicks from the bottom bar
  useEffect(() => {
    const handler = () => setMoreOpen(true);
    window.addEventListener('open-more-panel', handler);
    return () => window.removeEventListener('open-more-panel', handler);
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Dot-grid background */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />

      {/* Desktop sidebar (hidden on mobile) */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto lg:pt-0 scrollbar-thin relative">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen lg:min-h-screen pb-20 lg:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar onMoreClick={() => setMoreOpen(true)} />

      {/* More panel (Instagram-style slide-up) */}
      <MorePanel open={moreOpen} onClose={() => setMoreOpen(false)} />

      <ToastAlerts />
    </div>
  );
}
