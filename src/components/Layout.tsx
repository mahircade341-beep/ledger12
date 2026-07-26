import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ToastAlerts from './ToastAlerts';

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-[#0F172A]">
      {/* Subtle dot-grid background */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.04)_0%,transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(244,63,94,0.03)_0%,transparent_50%)] pointer-events-none" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14 scrollbar-thin relative">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-[calc(100vh-56px)] lg:min-h-screen">
          <Outlet />
        </div>
      </main>
      <ToastAlerts />
    </div>
  );
}
