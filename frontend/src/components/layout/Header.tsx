import { useNavigate } from 'react-router-dom';
import { Menu, Search, Settings, LogOut, User } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/DropdownMenu';
import { NotificationDropdown } from './NotificationDropdown';

export function Header() {
  const navigate = useNavigate();
  const { toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b border-surface-700 bg-surface-900 px-4">
      <button
        onClick={toggleSidebar}
        className="rounded-md p-1.5 text-surface-400 hover:bg-surface-800 hover:text-surface-200 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg border border-surface-700 bg-surface-800 py-1.5 pl-9 pr-3 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationDropdown />

        <DropdownMenu
          trigger={
            <button className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:ring-2 hover:ring-surface-600">
              <Avatar src={user?.avatarUrl} name={user?.name} size="sm" />
            </button>
          }
        >
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-surface-200">{user?.name}</p>
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
