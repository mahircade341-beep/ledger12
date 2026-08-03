import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ToastAlerts from './ToastAlerts';
import InstallBanner from './InstallBanner';
import AnimatedBackground from './AnimatedBackground';

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-ios26">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AnimatedBackground />
      <Sidebar />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto lg:pt-0 pt-14 scrollbar-thin relative">
        <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto min-h-[calc(100vh-56px)] lg:min-h-screen animate-fade-in-v2">
          <Outlet />
        </div>
      </main>
      <InstallBanner />
      <ToastAlerts />
    </div>
  );
}
