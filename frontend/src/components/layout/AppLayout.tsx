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
  const { sidebarOpen, sidebarCollapsed } = useUIStore();
  const { activeWorkspaceId } = useWorkspaceStore();

  useNotificationSocket();
  useWorkspaceSocketEvents(activeWorkspaceId ?? undefined);

  return (
    <div className="flex h-screen bg-surface-950 text-surface-100">
      {/* Desktop sidebar */}
      <div
        className={cn(
          'hidden lg:block',
          !sidebarOpen && 'lg:hidden',
        )}
      >
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => useUIStore.getState().toggleSidebar()}
          />
          <div className="relative z-50">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main
          className={cn(
            'flex-1 overflow-y-auto p-6',
            sidebarCollapsed ? 'max-w-full' : 'max-w-full',
          )}
        >
          <Outlet />
        </main>
      </div>

      <TaskDetailPanel />
      <ToastContainer />
      <ConnectionStatus />
    </div>
  );
}
