import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Check, X } from 'lucide-react';
import type { User, ProjectMember, TaskAssignee } from '@/types/models.types';
import { useAuthStore } from '@/store/auth.store';
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const currentUser = useAuthStore((s) => s.user);

  // Derive selected IDs
  const serverSelectedIds: string[] =
    currentAssignees && currentAssignees.length > 0
      ? currentAssignees.map((a) => a.userId)
      : currentAssigneeId
        ? [currentAssigneeId]
        : [];

  // Optimistic local state
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(serverSelectedIds);

  // Sync local state when server data changes
  useEffect(() => {
    setLocalSelectedIds(serverSelectedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(serverSelectedIds)]);

  // Resolve selected users for display
  const selectedUsers: User[] = localSelectedIds
    .map((uid) => {
      const fromAssignees = currentAssignees?.find((a) => a.userId === uid)?.user;
      if (fromAssignees) return fromAssignees;
      if (currentAssignee && currentAssignee.id === uid) return currentAssignee;
      const fromMembers = members.find((m) => m.userId === uid)?.user;
      return fromMembers || null;
    })
    .filter(Boolean) as User[];

  // Position the dropdown relative to trigger
  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < dropdownHeight
      ? rect.top - dropdownHeight
      : rect.bottom + 4;
    setPos({
      top: Math.max(8, top),
      left: rect.left,
      width: Math.max(rect.width, 260),
    });
  }, []);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((prev) => {
      if (!prev) updatePos();
      return !prev;
    });
  }, [updatePos]);

  // Focus search and update position when dropdown opens
  useEffect(() => {
    if (open) {
      updatePos();
      requestAnimationFrame(() => searchRef.current?.focus());
      window.addEventListener('scroll', updatePos, true);
      window.addEventListener('resize', updatePos);
      return () => {
        window.removeEventListener('scroll', updatePos, true);
        window.removeEventListener('resize', updatePos);
      };
    } else {
      setSearch('');
    }
  }, [open, updatePos]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Sort members: "Me" first, then alphabetical
  const sortedMembers = [...members].sort((a, b) => {
    if (currentUser) {
      if (a.userId === currentUser.id) return -1;
      if (b.userId === currentUser.id) return 1;
    }
    const nameA = a.user?.name || a.user?.displayName || '';
    const nameB = b.user?.name || b.user?.displayName || '';
    return nameA.localeCompare(nameB);
  });

  const filtered = sortedMembers.filter((m) => {
    const name = m.user?.name || m.user?.displayName || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  function handleSelect(e: React.MouseEvent, userId: string) {
    e.stopPropagation();
    e.preventDefault();
    if (onChangeMultiple) {
      const isSelected = localSelectedIds.includes(userId);
      const newIds = isSelected
        ? localSelectedIds.filter((id) => id !== userId)
        : [...localSelectedIds, userId];
      setLocalSelectedIds(newIds);
      onChangeMultiple(newIds);
    } else {
      const isSelected = localSelectedIds.includes(userId);
      const newId = isSelected ? null : userId;
      setLocalSelectedIds(newId ? [newId] : []);
      onChange(newId);
      setOpen(false);
      setSearch('');
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setLocalSelectedIds([]);
    if (onChangeMultiple) {
      onChangeMultiple([]);
    } else {
      onChange(null);
    }
    setOpen(false);
    setSearch('');
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 hover:border-surface-600 transition-colors w-full min-h-[34px]"
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
        <div
          ref={dropdownRef}
          role="listbox"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 99999,
          }}
          className="rounded-lg border border-surface-700 bg-surface-800 shadow-2xl"
        >
          {/* Search */}
          <div className="p-2">
            <div className="flex items-center gap-2 rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1.5">
              <Search className="h-4 w-4 text-surface-500 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-transparent text-sm text-white placeholder-surface-500 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSearch('');
                  }}
                  className="text-surface-500 hover:text-surface-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Member list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {/* Unassign option when someone is assigned */}
            {localSelectedIds.length > 0 && (
              <button
                type="button"
                onMouseDown={handleClear}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-surface-400 transition-colors hover:bg-surface-700"
              >
                <Avatar src={null} name={undefined} size="sm" />
                <span>Unassign</span>
              </button>
            )}

            {filtered.map((member) => {
              const isSelected = localSelectedIds.includes(member.userId);
              const user = member.user;
              const isMe = currentUser && member.userId === currentUser.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => handleSelect(e, member.userId)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-surface-700',
                    isSelected && 'bg-surface-700/40',
                  )}
                >
                  <Avatar
                    src={user?.avatarUrl}
                    name={user?.name || user?.displayName}
                    size="sm"
                  />
                  <span className="truncate text-white">
                    {isMe ? 'Me' : (user?.name || user?.displayName || 'Unknown')}
                  </span>
                  {isSelected && (
                    <Check className="ml-auto h-4 w-4 text-primary-400 shrink-0" />
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm text-surface-500 text-center">No members found</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
