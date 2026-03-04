import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { X, Trash2, Flag, CircleDot, Users } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useSelectionStore } from '@/store/selection.store';
import { useBulkUpdateTasks, useBulkDeleteTasks } from '@/hooks/useTasks';
import { useStatuses } from '@/hooks/useStatuses';
import { useProjectMembers } from '@/hooks/useMembers';
import { Avatar } from '@/components/ui/Avatar';
import type { Priority, ProjectMember } from '@/types/models.types';

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'URGENT' as Priority, label: 'Urgent', color: '#EF4444' },
  { value: 'HIGH' as Priority, label: 'High', color: '#F97316' },
  { value: 'MEDIUM' as Priority, label: 'Medium', color: '#EAB308' },
  { value: 'LOW' as Priority, label: 'Low', color: '#3B82F6' },
  { value: 'NONE' as Priority, label: 'None', color: '#6B7280' },
];

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return { open, setOpen, ref };
}

export function BulkActionBar() {
  const { projectId } = useParams<{ projectId: string }>();
  const { selectedTaskIds, clearSelection } = useSelectionStore();
  const bulkUpdate = useBulkUpdateTasks();
  const bulkDelete = useBulkDeleteTasks();
  const { data: statuses } = useStatuses(projectId ?? '');
  const { data: members } = useProjectMembers(projectId ?? '');

  const statusDD = useDropdown();
  const priorityDD = useDropdown();
  const assigneeDD = useDropdown();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const count = selectedTaskIds.size;
  const taskIds = Array.from(selectedTaskIds);

  // Escape key clears selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [clearSelection]);

  const handleStatusChange = useCallback((statusId: string) => {
    bulkUpdate.mutate(
      { taskIds, updates: { statusId } },
      { onSuccess: () => clearSelection() },
    );
    statusDD.setOpen(false);
  }, [taskIds, bulkUpdate, clearSelection, statusDD]);

  const handlePriorityChange = useCallback((priority: string) => {
    bulkUpdate.mutate(
      { taskIds, updates: { priority } },
      { onSuccess: () => clearSelection() },
    );
    priorityDD.setOpen(false);
  }, [taskIds, bulkUpdate, clearSelection, priorityDD]);

  const handleAssigneeChange = useCallback((assigneeIds: string[]) => {
    bulkUpdate.mutate(
      { taskIds, updates: { assigneeIds } },
      { onSuccess: () => clearSelection() },
    );
    assigneeDD.setOpen(false);
  }, [taskIds, bulkUpdate, clearSelection, assigneeDD]);

  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    bulkDelete.mutate(
      { taskIds },
      {
        onSuccess: () => {
          clearSelection();
          setConfirmDelete(false);
        },
      },
    );
  }, [confirmDelete, taskIds, bulkDelete, clearSelection]);

  if (count === 0) return null;

  const isLoading = bulkUpdate.isPending || bulkDelete.isPending;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.12] bg-[#1E1E26] px-4 py-2.5 shadow-2xl shadow-black/60">
        {/* Count */}
        <span className="text-sm font-medium text-white whitespace-nowrap">
          {count} selected
        </span>

        <div className="h-5 w-px bg-white/[0.1]" />

        {/* Status dropdown */}
        <div className="relative" ref={statusDD.ref}>
          <button
            onClick={() => statusDD.setOpen(!statusDD.open)}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
          >
            <CircleDot className="h-3.5 w-3.5" />
            Status
          </button>
          {statusDD.open && statuses && (
            <div className="absolute bottom-full left-0 mb-2 min-w-[160px] rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl">
              {[...statuses].sort((a, b) => a.position - b.position).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleStatusChange(s.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.04]"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority dropdown */}
        <div className="relative" ref={priorityDD.ref}>
          <button
            onClick={() => priorityDD.setOpen(!priorityDD.open)}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
          >
            <Flag className="h-3.5 w-3.5" />
            Priority
          </button>
          {priorityDD.open && (
            <div className="absolute bottom-full left-0 mb-2 min-w-[140px] rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handlePriorityChange(p.value)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.04]"
                >
                  <Flag
                    className="h-3.5 w-3.5"
                    style={{ color: p.color }}
                    fill={p.value !== 'NONE' ? 'currentColor' : 'none'}
                  />
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Assignee dropdown */}
        <div className="relative" ref={assigneeDD.ref}>
          <button
            onClick={() => assigneeDD.setOpen(!assigneeDD.open)}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
          >
            <Users className="h-3.5 w-3.5" />
            Assign
          </button>
          {assigneeDD.open && members && (
            <div className="absolute bottom-full left-0 mb-2 min-w-[200px] max-h-[240px] overflow-y-auto rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl">
              <button
                onClick={() => handleAssigneeChange([])}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:bg-white/[0.04]"
              >
                Unassign all
              </button>
              {members.map((m: ProjectMember) => {
                const user = m.user;
                if (!user) return null;
                const displayName = user.name || user.displayName || user.email;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleAssigneeChange([user.id])}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.04]"
                  >
                    <Avatar src={user.avatarUrl} name={displayName} size="sm" />
                    <span className="truncate">{displayName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-white/[0.1]" />

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors disabled:opacity-50',
            confirmDelete
              ? 'bg-red-600 text-white hover:bg-red-500'
              : 'text-red-400 hover:bg-red-500/10',
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {confirmDelete ? 'Confirm' : 'Delete'}
        </button>

        <div className="h-5 w-px bg-white/[0.1]" />

        {/* Clear */}
        <button
          onClick={clearSelection}
          className="flex items-center justify-center rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gray-300"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
