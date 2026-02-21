import { Menu, Search, User } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';

export function Header() {
  const { toggleSidebar } = useUIStore();

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

      <div className="flex items-center gap-3">
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-700 text-surface-300 hover:bg-surface-600">
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
