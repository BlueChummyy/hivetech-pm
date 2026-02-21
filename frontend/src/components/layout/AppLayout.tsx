import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TaskDetailPanel } from '@/components/task-detail/TaskDetailPanel';
import { ToastContainer } from './ToastContainer';
import { ConnectionStatus } from './ConnectionStatus';
import { useUIStore } from '@/store/ui.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { useWorkspaceSocketEvents } from '@/hooks/useWorkspaceSocketEvents';
import { cn } from '@/utils/cn';

export function AppLayout() {
  const { sidebarOpen } = useUIStore();
  const { activeWorkspaceId } = useWorkspaceStore();

  useNotificationSocket();
  useWorkspaceSocketEvents(activeWorkspaceId ?? undefined);

  return (
    <div className="flex h-screen bg-surface-950 text-surface-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:block',
          !sidebarOpen && 'lg:hidden',
        )}
      >
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => useUIStore.getState().toggleSidebar()}
            aria-hidden="true"
          />
          <aside className="relative z-50">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main id="main-content" role="main" className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <TaskDetailPanel />
      <ToastContainer />
      <ConnectionStatus />
    </div>
  );
}
