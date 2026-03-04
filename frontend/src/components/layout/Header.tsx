import { useNavigate } from 'react-router-dom';
import { Menu, Settings, LogOut, User } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/DropdownMenu';
import { NotificationDropdown } from './NotificationDropdown';
import { SearchDropdown } from './SearchDropdown';
import { authApi } from '@/api/auth';

export function Header() {
  const navigate = useNavigate();
  const { toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    useWorkspaceStore.getState().clearActiveWorkspace();
    useUIStore.getState().closeTaskPanel();
    navigate('/login', { replace: true });
  };

  return (
    <header role="banner" className="flex h-14 items-center gap-2 sm:gap-4 border-b border-surface-700 bg-surface-900 px-2 sm:px-4">
      <button
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="rounded-md p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-surface-400 hover:bg-surface-800 hover:text-surface-200 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 flex justify-center min-w-0">
        <SearchDropdown />
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <NotificationDropdown />

        <DropdownMenu
          trigger={
            <button aria-label="User menu" aria-haspopup="menu" className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:ring-2 hover:ring-surface-600">
              <Avatar src={user?.avatarUrl} name={user?.name || user?.displayName} size="sm" />
            </button>
          }
        >
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-surface-200">{user?.name || user?.displayName}</p>
            <p className="text-xs text-surface-500">{user?.email}</p>
          </div>
          <DropdownSeparator />
          <DropdownItem
            icon={<User className="h-4 w-4" />}
            onClick={() => navigate('/settings/profile')}
          >
            Profile
          </DropdownItem>
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
    </header>
  );
}
