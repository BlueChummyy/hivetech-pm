import { useState, useRef, useEffect } from 'react';
import { UserCircle } from 'lucide-react';
import type { User, ProjectMember } from '@/types/models.types';
import { cn } from '@/utils/cn';

interface AssigneeSelectorProps {
  members: ProjectMember[];
  currentAssigneeId: string | null;
  currentAssignee?: User | null;
  onChange: (assigneeId: string | null) => void;
}

export function AssigneeSelector({
  members,
  currentAssigneeId,
  currentAssignee,
  onChange,
}: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = members.filter((m) => {
    const userName = m.user?.name || m.user?.displayName || '';
    return userName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 hover:border-surface-600 transition-colors w-full"
      >
        {currentAssignee?.avatarUrl ? (
          <img
            src={currentAssignee.avatarUrl}
            alt=""
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : (
          <UserCircle className="h-5 w-5 shrink-0 text-surface-500" />
        )}
        <span className="truncate">
          {currentAssignee?.name || currentAssignee?.displayName || 'Unassigned'}
        </span>
      </button>

      {open && (
        <div role="listbox" className="absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] rounded-lg border border-surface-700 bg-surface-800 shadow-xl">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1.5 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            <button
              role="option"
              aria-selected={!currentAssigneeId}
              onClick={() => {
                onChange(null);
                setOpen(false);
                setSearch('');
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-surface-700',
                !currentAssigneeId
                  ? 'text-surface-100 bg-surface-700/50'
                  : 'text-surface-400',
              )}
            >
              <UserCircle className="h-5 w-5 shrink-0" />
              <span>Unassigned</span>
            </button>
            {filtered.map((member) => (
              <button
                key={member.id}
                role="option"
                aria-selected={member.userId === currentAssigneeId}
                onClick={() => {
                  onChange(member.userId);
                  setOpen(false);
                  setSearch('');
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-surface-700',
                  member.userId === currentAssigneeId
                    ? 'text-surface-100 bg-surface-700/50'
                    : 'text-surface-300',
                )}
              >
                {member.user?.avatarUrl ? (
                  <img
                    src={member.user.avatarUrl}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-5 w-5 shrink-0 text-surface-500" />
                )}
                <span className="truncate">{member.user?.name || member.user?.displayName || 'Unknown'}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-surface-500">No members found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
