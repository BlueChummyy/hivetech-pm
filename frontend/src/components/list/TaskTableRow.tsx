import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/ui.store';
import { useUpdateTask } from '@/hooks/useTasks';
import type { Task, ProjectStatus, Priority } from '@/types/models.types';

const PRIORITY_COLORS: Record<Priority, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
  NONE: 'bg-gray-500',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  NONE: 'None',
};

const ALL_PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'] as Priority[];

interface TaskTableRowProps {
  task: Task;
  statuses: ProjectStatus[];
}

function StatusBadge({
  task,
  statuses,
}: {
  task: Task;
  statuses: ProjectStatus[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const updateTask = useUpdateTask();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentStatus = statuses.find((s) => s.id === task.statusId);

  const handleSelect = (statusId: string) => {
    setOpen(false);
    if (statusId !== task.statusId) {
      updateTask.mutate({ id: task.id, data: { statusId } });
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-colors hover:bg-white/[0.06]"
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: currentStatus?.color ?? '#6B7280' }}
        />
        {currentStatus?.name ?? 'Unknown'}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl">
          {statuses.map((s) => (
            <button
              key={s.id}
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
              />
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const updateTask = useUpdateTask();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (priority: string) => {
    setOpen(false);
    if (priority !== task.priority) {
      updateTask.mutate({ id: task.id, data: { priority } });
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-colors hover:bg-white/[0.06]"
      >
        <span className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[task.priority])} />
        {PRIORITY_LABELS[task.priority]}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-white/[0.08] bg-[#1E1E26] py-1 shadow-xl">
          {ALL_PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(p);
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.04]',
                p === task.priority && 'text-white',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[p])} />
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskTableRow({ task, statuses }: TaskTableRowProps) {
  const handleRowClick = () => {
    useUIStore.getState().openTaskPanel(task.id);
  };

  return (
    <tr
      onClick={handleRowClick}
      className="group cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
    >
      {/* Identifier */}
      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-500">
        {task.identifier}
      </td>

      {/* Title */}
      <td className="px-4 py-2.5">
        <span className="text-sm text-white group-hover:text-indigo-400 transition-colors">
          {task.title}
        </span>
        {task.labels && task.labels.length > 0 && (
          <div className="mt-1 flex gap-1">
            {task.labels.map((tl) => (
              <span
                key={tl.id}
                className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: `${tl.label?.color ?? '#6366f1'}20`,
                  color: tl.label?.color ?? '#6366f1',
                }}
              >
                {tl.label?.name}
              </span>
            ))}
          </div>
        )}
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
        {task.assignee ? (
          <div className="flex items-center gap-2">
            {task.assignee.avatarUrl ? (
              <img
                src={task.assignee.avatarUrl}
                alt={task.assignee.name}
                className="h-5 w-5 rounded-full"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-medium text-white">
                {task.assignee.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-gray-300">{task.assignee.name}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-500">Unassigned</span>
        )}
      </td>

      {/* Due date */}
      <td className="whitespace-nowrap px-4 py-2.5 text-sm text-gray-400">
        {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '\u2014'}
      </td>
    </tr>
  );
}
