import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="h-screen flex bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14 scrollbar-thin">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
