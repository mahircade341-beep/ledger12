import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ToastAlerts from './ToastAlerts';

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-v2-pattern">
      {/* Subtle dot-grid background */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14 scrollbar-thin relative">
        <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto min-h-[calc(100vh-56px)] lg:min-h-screen animate-fade-in-v2">
          <Outlet />
        </div>
      </main>
      <ToastAlerts />
    </div>
  );
}
