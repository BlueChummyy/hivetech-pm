import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TaskDetailPanel } from '@/components/task-detail/TaskDetailPanel';
import { ToastContainer } from './ToastContainer';
import { useUIStore } from '@/store/ui.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { useWorkspaceSocketEvents } from '@/hooks/useWorkspaceSocketEvents';
import { useBrandingEffect } from '@/hooks/useBrandingEffect';

export function AppLayout() {
  const { sidebarOpen } = useUIStore();
  const { activeWorkspaceId } = useWorkspaceStore();

  useNotificationSocket();
  useWorkspaceSocketEvents(activeWorkspaceId ?? undefined);
  useBrandingEffect();

  return (
    <div className="flex h-screen bg-surface-950 text-surface-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:bg-primary-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      {/* Desktop sidebar - always visible on lg+ */}
      <aside className="hidden lg:block">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay - only shown when sidebarOpen on small screens */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => useUIStore.setState({ sidebarOpen: false })}
            onTouchEnd={(e) => {
              e.preventDefault();
              useUIStore.setState({ sidebarOpen: false });
            }}
            aria-hidden="true"
          />
          <aside className="relative z-50">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main id="main-content" role="main" className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 4xl:p-10">
          <div className="mx-auto 4xl:max-w-[2400px]">
            <Outlet />
          </div>
        </main>
      </div>

      <TaskDetailPanel />
      <ToastContainer />
    </div>
  );
}
