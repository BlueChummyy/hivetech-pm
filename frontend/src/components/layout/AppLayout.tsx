import { useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TaskDetailPanel } from '@/components/task-detail/TaskDetailPanel';
import { ToastContainer } from './ToastContainer';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { useWorkspaceSocketEvents } from '@/hooks/useWorkspaceSocketEvents';
import { useBrandingEffect } from '@/hooks/useBrandingEffect';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { getBackgroundStyle } from '@/utils/backgroundTemplates';
import { authApi } from '@/api/auth';

export function AppLayout() {
  const { sidebarOpen } = useUIStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const openShortcutsModal = useCallback(() => setShortcutsModalOpen(true), []);

  // Refresh user profile on mount to pick up new fields (e.g. isGlobalAdmin)
  useEffect(() => {
    const { isAuthenticated, setUser } = useAuthStore.getState();
    if (isAuthenticated) {
      authApi.me().then((res) => {
        const u = res.data;
        setUser({
          ...u,
          name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        });
      }).catch(() => {});
    }
  }, []);

  useNotificationSocket();
  useWorkspaceSocketEvents(activeWorkspaceId ?? undefined);
  const branding = useBrandingEffect();
  useKeyboardShortcuts(openShortcutsModal);

  return (
    <div className={cn('flex h-screen text-surface-100', branding?.appBackground ? '' : 'bg-surface-950')} style={getBackgroundStyle(branding?.appBackground)}>
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
        <div
          className="fixed inset-0 z-40 flex lg:hidden"
          onPointerDown={(e) => {
            // Close if tapping outside the sidebar (the backdrop area)
            const sidebar = (e.currentTarget as HTMLElement).querySelector('[data-sidebar]');
            if (sidebar && !sidebar.contains(e.target as Node)) {
              useUIStore.setState({ sidebarOpen: false });
            }
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
          {/* Sidebar */}
          <aside data-sidebar className="relative z-50 shrink-0">
            <Sidebar />
          </aside>
          {/* Tap-to-close zone fills the rest */}
          <div className="relative z-50 flex-1" />
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
      <KeyboardShortcutsModal
        open={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
}
