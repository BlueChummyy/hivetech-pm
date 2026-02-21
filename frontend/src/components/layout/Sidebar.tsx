import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  ChevronLeft,
  Hexagon,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/ui.store';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Projects', icon: FolderKanban, path: '/projects' },
  { label: 'My Tasks', icon: CheckSquare, path: '/my-tasks' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, collapseSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-surface-700 bg-surface-900 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex items-center gap-3 border-b border-surface-700 px-4 py-4">
        <Hexagon className="h-8 w-8 shrink-0 text-primary-400" />
        {!sidebarCollapsed && (
          <span className="text-lg font-bold text-surface-100">
            HiveTech
          </span>
        )}
        <button
          onClick={() => collapseSidebar(!sidebarCollapsed)}
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

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
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
    </aside>
  );
}
