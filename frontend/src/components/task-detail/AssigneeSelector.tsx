import { useState, useRef, useEffect } from 'react';
import { UserCircle, X } from 'lucide-react';
import type { User, ProjectMember, TaskAssignee } from '@/types/models.types';
import { cn } from '@/utils/cn';
import { Avatar } from '@/components/ui/Avatar';

interface AssigneeSelectorProps {
  members: ProjectMember[];
  currentAssigneeId: string | null;
  currentAssignee?: User | null;
  currentAssignees?: TaskAssignee[];
  onChange: (assigneeId: string | null) => void;
  onChangeMultiple?: (assigneeIds: string[]) => void;
}

export function AssigneeSelector({
  members,
  currentAssigneeId,
  currentAssignee,
  currentAssignees,
  onChange,
  onChangeMultiple,
}: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Determine selected user IDs from multi-assignee or single assignee
  const selectedIds: string[] =
    currentAssignees && currentAssignees.length > 0
      ? currentAssignees.map((a) => a.userId)
      : currentAssigneeId
        ? [currentAssigneeId]
        : [];

  // Resolve selected users for display
  const selectedUsers: User[] = selectedIds
    .map((uid) => {
      // First check from assignees data
      const fromAssignees = currentAssignees?.find((a) => a.userId === uid)?.user;
      if (fromAssignees) return fromAssignees;
      // Fall back to single currentAssignee
      if (currentAssignee && currentAssignee.id === uid) return currentAssignee;
      // Fall back to members
      const fromMembers = members.find((m) => m.userId === uid)?.user;
      return fromMembers || null;
    })
    .filter(Boolean) as User[];

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

  function toggleUser(userId: string) {
    const isSelected = selectedIds.includes(userId);
    let newIds: string[];
    if (isSelected) {
      newIds = selectedIds.filter((id) => id !== userId);
    } else {
      newIds = [...selectedIds, userId];
    }

    if (onChangeMultiple) {
      onChangeMultiple(newIds);
    } else {
      // Fall back to single-assignee mode
      onChange(newIds.length > 0 ? newIds[0] : null);
    }
  }

  function removeUser(userId: string) {
    const newIds = selectedIds.filter((id) => id !== userId);
    if (onChangeMultiple) {
      onChangeMultiple(newIds);
    } else {
      onChange(newIds.length > 0 ? newIds[0] : null);
    }
  }

  function clearAll() {
    if (onChangeMultiple) {
      onChangeMultiple([]);
    } else {
      onChange(null);
    }
    setOpen(false);
    setSearch('');
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 hover:border-surface-600 transition-colors w-full min-h-[34px]"
      >
        {selectedUsers.length === 0 ? (
          <>
            <Avatar src={null} name={undefined} size="sm" />
            <span className="truncate">Unassigned</span>
          </>
        ) : selectedUsers.length === 1 ? (
          <>
            <Avatar src={selectedUsers[0].avatarUrl} name={selectedUsers[0].name || selectedUsers[0].displayName} size="sm" />
            <span className="truncate">{selectedUsers[0].name || selectedUsers[0].displayName}</span>
          </>
        ) : (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {selectedUsers.slice(0, 3).map((u) => (
                <Avatar key={u.id} src={u.avatarUrl} name={u.name || u.displayName} size="sm" />
              ))}
            </div>
            <span className="text-xs text-surface-400">{selectedUsers.length} assigned</span>
          </div>
        )}
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

          {/* Selected users chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1 px-2 pb-2">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-500/20 px-2 py-0.5 text-xs text-primary-300"
                >
                  {u.name || u.displayName}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUser(u.id);
                    }}
                    className="hover:text-primary-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto py-1">
            {selectedUsers.length > 0 && (
              <button
                onClick={clearAll}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-surface-400 transition-colors hover:bg-surface-700"
              >
                <UserCircle className="h-5 w-5 shrink-0" />
                <span>Clear all</span>
              </button>
            )}
            {filtered.map((member) => {
              const isSelected = selectedIds.includes(member.userId);
              return (
                <button
                  key={member.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleUser(member.userId)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-surface-700',
                    isSelected
                      ? 'text-surface-100 bg-surface-700/50'
                      : 'text-surface-300',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border shrink-0',
                      isSelected ? 'border-primary-500 bg-primary-500' : 'border-surface-600',
                    )}
                  >
                    {isSelected && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <Avatar src={member.user?.avatarUrl} name={member.user?.name || member.user?.displayName} size="sm" />
                  <span className="truncate">{member.user?.name || member.user?.displayName || 'Unknown'}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-surface-500">No members found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
