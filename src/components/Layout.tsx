import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomTabBar from './BottomTabBar';
import ToastAlerts from './ToastAlerts';
import InstallBanner from './InstallBanner';
import AnimatedBackground from './AnimatedBackground';
import { startAutoSync } from '../lib/syncEngine';

export default function Layout() {
  useEffect(() => {
    startAutoSync();
  }, []);

  return (
    <div className="min-h-screen bg-ios26">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AnimatedBackground />
      <TopBar />

      <main id="main-content" tabIndex={-1} className="pt-16 scrollbar-thin relative">
        <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto min-h-[calc(100vh-112px)] animate-fade-in-v2 pb-40 lg:pb-36">
          <Outlet />
        </div>
      </main>

      <BottomTabBar />
      <InstallBanner />
      <ToastAlerts />
    </div>
  );
}
