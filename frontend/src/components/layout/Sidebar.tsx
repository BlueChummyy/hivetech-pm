import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  ChevronLeft,
  ChevronDown,
  Hexagon,
  Settings,
  LogOut,
  Check,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/DropdownMenu';
import { authApi } from '@/api/auth';
import { ConnectionStatus } from './ConnectionStatus';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, collapseSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { data: workspaces } = useWorkspaces();

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (!activeWorkspaceId && workspaces && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0].id);
    }
  }, [activeWorkspaceId, workspaces, setActiveWorkspace]);

  const activeWorkspace = workspaces?.find((w) => w.id === activeWorkspaceId);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    {
      label: 'Projects',
      icon: FolderKanban,
      path: activeWorkspaceId
        ? `/workspaces/${activeWorkspaceId}/projects`
        : '/dashboard',
    },
    { label: 'My Tasks', icon: CheckSquare, path: '/my-tasks' },
    { label: 'Notifications', icon: Bell, path: '/notifications' },
  ];

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    useWorkspaceStore.getState().clearActiveWorkspace();
    useUIStore.getState().closeTaskPanel();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        'flex h-screen flex-col border-r border-surface-700 bg-surface-900 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Workspace header with switcher */}
      <div className="flex items-center gap-3 border-b border-surface-700 px-4 py-4">
        <Hexagon className="h-8 w-8 shrink-0 text-primary-400" />
        {!sidebarCollapsed && (
          <DropdownMenu
            align="left"
            trigger={
              <button className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-surface-800">
                <span className="block truncate text-sm font-bold text-surface-100">
                  {activeWorkspace?.name || 'HiveTech'}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 text-surface-400" />
              </button>
            }
          >
            {workspaces?.map((ws) => (
              <DropdownItem
                key={ws.id}
                icon={ws.id === activeWorkspaceId
                  ? <Check className="h-4 w-4 text-primary-400" />
                  : <span className="h-4 w-4" />}
                onClick={() => {
                  setActiveWorkspace(ws.id);
                  navigate(`/workspaces/${ws.id}/projects`);
                }}
              >
                {ws.name}
              </DropdownItem>
            ))}
          </DropdownMenu>
        )}
        <button
          onClick={() => collapseSidebar(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="ml-auto rounded-md p-1 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              sidebarCollapsed && 'rotate-180',
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive =
            item.path === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.label}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200',
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Connection status + User section */}
      <div className="border-t border-surface-700 px-2 py-3">
        {!sidebarCollapsed && (
          <div className="mb-2 flex justify-center">
            <ConnectionStatus />
          </div>
        )}
      </div>
      <div className="px-2 pb-3">
        <DropdownMenu
          align="left"
          trigger={
            <button className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-800',
              sidebarCollapsed && 'justify-center px-0',
            )}>
              <Avatar src={user?.avatarUrl} name={user?.name} size="sm" />
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-200">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-surface-500">
                    {user?.email}
                  </p>
                </div>
              )}
            </button>
          }
        >
          <DropdownItem
            icon={<Settings className="h-4 w-4" />}
            onClick={() => navigate('/settings/profile')}
          >
            Settings
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            icon={<LogOut className="h-4 w-4" />}
            onClick={handleLogout}
            destructive
          >
            Log out
          </DropdownItem>
        </DropdownMenu>
      </div>
    </aside>
  );
}
