import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';
import { GripVertical, ChevronRight, ChevronDown, MessageSquare, Paperclip, Flag } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/ui.store';
import { useUpdateTask } from '@/hooks/useTasks';
import { useProjectMembers } from '@/hooks/useMembers';
import { Avatar } from '@/components/ui/Avatar';
import { TaskContextMenu } from '@/components/TaskContextMenu';
import type { Task, ProjectStatus, Priority, ProjectMember } from '@/types/models.types';

const PRIORITY_COLORS: Record<Priority, string> = {
  URGENT: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#3B82F6',
  NONE: '#6B7280',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  NONE: 'None',
};

const ALL_PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'] as Priority[];

/* ------------------------------------------------------------------ */
/*  Portal dropdown hook                                              */
/* ------------------------------------------------------------------ */
function usePortalDropdown() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => {
      if (!prev && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownHeight = 200; // estimated max height
        const spaceBelow = window.innerHeight - rect.bottom;
        const top = spaceBelow < dropdownHeight
          ? rect.top - dropdownHeight
          : rect.bottom + 4;
        setPos({ top: Math.max(8, top), left: rect.left });
      }
      return !prev;
    });
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return { open, pos, triggerRef, dropdownRef, toggle, close };
}

/* ------------------------------------------------------------------ */
/*  StatusBadge (portal)                                              */
/* ------------------------------------------------------------------ */
function StatusBadge({
  task,
  statuses,
}: {
  task: Task;
  statuses: ProjectStatus[];
}) {
  const { open, pos, triggerRef, dropdownRef, toggle, close } = usePortalDropdown();
  const updateTask = useUpdateTask();
  const currentStatus = statuses.find((s) => s.id === task.statusId);

  const handleSelect = (statusId: string) => {
    close();
    if (statusId !== task.statusId) {
      updateTask.mutate({ id: task.id, data: { statusId } });
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-colors hover:bg-white/[0.06]"
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: currentStatus?.color ?? '#6B7280' }}
          aria-hidden="true"
        />
        {currentStatus?.name ?? 'Unknown'}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            className="fixed z-[9999] min-w-[160px] rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            {statuses.map((s) => (
              <button
                key={s.id}
                role="option"
                aria-selected={s.id === task.statusId}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(s.id);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.04]',
                  s.id === task.statusId && 'text-white',
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                  aria-hidden="true"
                />
                {s.name}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  PriorityBadge (portal)                                            */
/* ------------------------------------------------------------------ */
function PriorityBadge({ task }: { task: Task }) {
  const { open, pos, triggerRef, dropdownRef, toggle, close } = usePortalDropdown();
  const updateTask = useUpdateTask();

  const handleSelect = (priority: string) => {
    close();
    if (priority !== task.priority) {
      updateTask.mutate({ id: task.id, data: { priority } });
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-colors hover:bg-white/[0.06]"
      >
        <Flag className="h-3.5 w-3.5" style={{ color: PRIORITY_COLORS[task.priority] }} fill={task.priority !== 'NONE' ? 'currentColor' : 'none'} aria-hidden="true" />
        {PRIORITY_LABELS[task.priority]}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            className="fixed z-[9999] min-w-[140px] rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            {ALL_PRIORITIES.map((p) => (
              <button
                key={p}
                role="option"
                aria-selected={p === task.priority}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(p);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.04]',
                  p === task.priority && 'text-white',
                )}
              >
                <Flag className="h-3.5 w-3.5" style={{ color: PRIORITY_COLORS[p] }} fill={p !== 'NONE' ? 'currentColor' : 'none'} aria-hidden="true" />
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  AssigneeBadge – inline fixed dropdown with optimistic UI           */
/* ------------------------------------------------------------------ */
function AssigneeBadge({ task }: { task: Task }) {
  const { projectId } = useParams<{ projectId: string }>();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const updateTask = useUpdateTask();
  const { data: members } = useProjectMembers(projectId ?? '');
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Server-derived selected IDs
  const serverSelectedIds: string[] =
    task.assignees && task.assignees.length > 0
      ? task.assignees.map((a) => a.userId)
      : task.assigneeId ? [task.assigneeId] : [];

  // Optimistic local state for instant feedback
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(serverSelectedIds);

  // Sync local state when server data changes
  useEffect(() => {
    setLocalSelectedIds(serverSelectedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(serverSelectedIds)]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((prev) => {
      if (!prev && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownHeight = 300;
        const spaceBelow = window.innerHeight - rect.bottom;
        const top = spaceBelow < dropdownHeight
          ? rect.top - dropdownHeight
          : rect.bottom + 4;
        setPos({ top: Math.max(8, top), left: rect.left });
      }
      return !prev;
    });
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setSearch('');
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filteredMembers = (members ?? []).filter((m: ProjectMember) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (m.user?.name || m.user?.displayName || '').toLowerCase();
    const email = (m.user?.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  // Resolve display users from local state + members data
  const displayUsers = localSelectedIds
    .map((uid) => {
      const fromAssignees = task.assignees?.find((a) => a.userId === uid)?.user;
      if (fromAssignees) return fromAssignees;
      if (task.assignee && task.assignee.id === uid) return task.assignee;
      const fromMembers = (members ?? []).find((m) => m.userId === uid)?.user;
      return fromMembers || null;
    })
    .filter(Boolean);

  return (
    <>
      <button
        ref={triggerRef}
        onMouseDown={handleToggle}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded px-2 py-0.5 text-sm transition-colors hover:bg-white/[0.06]"
      >
        {displayUsers.length > 1 ? (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {displayUsers.slice(0, 3).map((user) => {
                if (!user) return null;
                return (
                  <Avatar
                    key={user.id}
                    src={user.avatarUrl}
                    name={user.name || user.displayName}
                    size="sm"
                    className="ring-1 ring-[#14141A]"
                  />
                );
              })}
            </div>
            <span className="text-gray-300">{displayUsers.length} assigned</span>
          </div>
        ) : displayUsers.length === 1 && displayUsers[0] ? (
          <>
            <Avatar
              src={displayUsers[0].avatarUrl}
              name={displayUsers[0].name || displayUsers[0].displayName}
              size="sm"
            />
            <span className="text-gray-300">{displayUsers[0].name || displayUsers[0].displayName}</span>
          </>
        ) : (
          <span className="text-gray-400">Unassigned</span>
        )}
      </button>
      {open && (
        <div
          ref={dropdownRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="w-[260px] rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl"
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999 }}
        >
          <div className="px-2 pb-1 pt-1.5">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded bg-white/[0.06] px-2 py-1 text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          {localSelectedIds.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setLocalSelectedIds([]);
                setOpen(false);
                updateTask.mutate({ id: task.id, data: { assigneeIds: [] } });
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:bg-white/[0.04]"
            >
              Clear all
            </button>
          )}
          {filteredMembers.map((m: ProjectMember) => {
            const user = m.user;
            if (!user) return null;
            const displayName = user.name || user.displayName || user.email;
            const isSelected = localSelectedIds.includes(user.id);
            return (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const newIds = isSelected
                    ? localSelectedIds.filter((id) => id !== user.id)
                    : [...localSelectedIds, user.id];
                  setLocalSelectedIds(newIds);
                  updateTask.mutate({ id: task.id, data: { assigneeIds: newIds } });
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06]',
                  isSelected && 'text-white bg-white/[0.03]',
                )}
              >
                <Avatar src={user.avatarUrl} name={displayName} size="sm" />
                <span className="truncate">{displayName}</span>
                {isSelected && (
                  <svg className="ml-auto h-4 w-4 text-primary-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
          {filteredMembers.length === 0 && search && (
            <div className="px-3 py-2 text-sm text-gray-500">No members found</div>
          )}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  InlineTitle                                                       */
/* ------------------------------------------------------------------ */
function InlineTitle({ task }: { task: Task }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateTask = useUpdateTask();

  useEffect(() => {
    setValue(task.title);
  }, [task.title]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask.mutate({ id: task.id, data: { title: trimmed } });
    } else {
      setValue(task.title);
    }
  };

  const cancel = () => {
    setEditing(false);
    setValue(task.title);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') cancel();
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded bg-white/[0.06] px-1.5 py-0.5 text-sm text-white outline-none ring-1 ring-primary-500"
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          setEditing(true);
        }
      }}
      className="cursor-text text-sm text-white group-hover:text-primary-400 transition-colors"
    >
      {task.title}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  DatePickerBadge (portal)                                          */
/* ------------------------------------------------------------------ */
function DatePickerBadge({
  task,
  field,
}: {
  task: Task;
  field: 'startDate' | 'dueDate';
}) {
  const { open, pos, triggerRef, dropdownRef, toggle, close } = usePortalDropdown();
  const updateTask = useUpdateTask();
  const dateValue = task[field];

  const handleChange = (newDate: string) => {
    close();
    updateTask.mutate({ id: task.id, data: { [field]: newDate || null } });
  };

  const handleClear = () => {
    close();
    updateTask.mutate({ id: task.id, data: { [field]: null } });
  };

  // Format for the input value (yyyy-MM-dd)
  const inputValue = dateValue ? format(new Date(dateValue), 'yyyy-MM-dd') : '';

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        className="rounded px-2 py-0.5 text-sm transition-colors hover:bg-white/[0.06] whitespace-nowrap"
      >
        {dateValue ? (
          <span className="text-gray-300">{format(new Date(dateValue), 'MMM d, yyyy')}</span>
        ) : (
          <span className="text-gray-500">Set date</span>
        )}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-lg border border-white/[0.08] bg-[#1E1E26] p-3 shadow-xl"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="date"
              value={inputValue}
              onChange={(e) => handleChange(e.target.value)}
              className="rounded border border-white/[0.08] bg-surface-800 px-2 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary-500 [color-scheme:dark]"
              autoFocus
            />
            {dateValue && (
              <button
                onClick={handleClear}
                className="mt-2 w-full rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Clear date
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  TaskTableRow                                                      */
/* ------------------------------------------------------------------ */
interface TaskTableRowProps {
  task: Task;
  statuses: ProjectStatus[];
  dragEnabled?: boolean;
  overlay?: boolean;
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  subtaskCount?: number;
}

export function TaskTableRow({ task, statuses, dragEnabled, overlay, depth = 0, hasChildren, isExpanded, onToggleExpand, subtaskCount }: TaskTableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !dragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRowClick = () => {
    useUIStore.getState().openTaskPanel(task.id);
  };

  return (
    <tr
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      onClick={handleRowClick}
      draggable={!overlay}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/task-id', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={cn(
        'group cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]',
        isDragging && 'opacity-50',
        overlay && 'bg-[#1E1E26] shadow-xl shadow-black/40 border border-white/[0.08]',
        task.closedAt && 'opacity-50',
      )}
    >
      {/* Drag handle */}
      <td className="w-8 px-1 py-2.5">
        {dragEnabled && !overlay ? (
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center rounded p-0.5 text-gray-600 hover:text-gray-400 hover:bg-white/[0.04] cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
      </td>

      {/* Task number */}
      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-400">
        #{task.taskNumber}
      </td>

      {/* Title */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1" style={depth > 0 ? { paddingLeft: `${depth * 24}px` } : undefined}>
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              className="flex items-center justify-center rounded p-0.5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : depth > 0 ? (
            <span className="w-5" />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={task.closedAt ? 'line-through text-gray-500' : ''}>
                <InlineTitle task={task} />
              </span>
              {task.closedAt && (
                <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                  CLOSED
                </span>
              )}
              {subtaskCount != null && subtaskCount > 0 && (
                <span className="shrink-0 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-gray-400">
                  {subtaskCount} subtask{subtaskCount !== 1 ? 's' : ''}
                </span>
              )}
              {(task._count?.comments ?? 0) > 0 && (
                <span className="flex shrink-0 items-center gap-0.5 text-gray-400" title={`${task._count!.comments} comment${task._count!.comments !== 1 ? 's' : ''}`}>
                  <MessageSquare className="h-3 w-3" />
                  <span className="text-[10px]">{task._count!.comments}</span>
                </span>
              )}
              {(task._count?.attachments ?? 0) > 0 && (
                <span className="flex shrink-0 items-center gap-0.5 text-gray-400" title={`${task._count!.attachments} attachment${task._count!.attachments !== 1 ? 's' : ''}`}>
                  <Paperclip className="h-3 w-3" />
                  <span className="text-[10px]">{task._count!.attachments}</span>
                </span>
              )}
            </div>
            {task.labels && task.labels.length > 0 && (
              <div className="mt-1 flex gap-1">
                {task.labels.map((tl) => (
                  <span
                    key={tl.id}
                    className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${tl.label?.color ?? '#4ade80'}20`,
                      color: tl.label?.color ?? '#4ade80',
                    }}
                  >
                    {tl.label?.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-2.5">
        <StatusBadge task={task} statuses={statuses} />
      </td>

      {/* Priority */}
      <td className="px-4 py-2.5">
        <PriorityBadge task={task} />
      </td>

      {/* Assignee */}
      <td className="px-4 py-2.5">
        <AssigneeBadge task={task} />
      </td>

      {/* Start date */}
      <td className="px-4 py-2.5">
        <DatePickerBadge task={task} field="startDate" />
      </td>

      {/* Due date */}
      <td className="px-4 py-2.5">
        <DatePickerBadge task={task} field="dueDate" />
      </td>

      {/* Actions */}
      <td className="w-10 px-2 py-2.5">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <TaskContextMenu task={task} />
        </div>
      </td>
    </tr>
  );
}
