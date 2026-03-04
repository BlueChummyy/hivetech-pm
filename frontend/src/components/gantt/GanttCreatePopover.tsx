import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useCreateTask } from '@/hooks/useTasks';
import { useStatuses } from '@/hooks/useStatuses';
import { useToast } from '@/components/ui/Toast';

interface GanttCreatePopoverProps {
  projectId: string;
  startDate: Date;
  position: { x: number; y: number };
  onClose: () => void;
}

export function GanttCreatePopover({ projectId, startDate, position, onClose }: GanttCreatePopoverProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const createTask = useCreateTask();
  const { data: statuses } = useStatuses(projectId);
  const { toast } = useToast();

  const dueDate = new Date(startDate);
  dueDate.setDate(dueDate.getDate() + 3);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  function handleCreate() {
    if (!title.trim()) return;
    const defaultStatus = statuses?.find((s) => s.isDefault) || statuses?.[0];
    if (!defaultStatus) {
      toast({ type: 'error', title: 'No statuses found for this project' });
      return;
    }

    createTask.mutate(
      {
        projectId,
        statusId: defaultStatus.id,
        title: title.trim(),
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
      },
      {
        onSuccess: () => {
          toast({ type: 'success', title: 'Task created' });
          onClose();
        },
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to create task', description: (err as Error).message });
        },
      },
    );
  }

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-72 rounded-lg border border-surface-600 bg-surface-800 p-3 shadow-xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">Task title</label>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Enter task title..."
            className="w-full rounded-md border border-surface-600 bg-surface-900 px-2.5 py-1.5 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex gap-3 text-xs">
          <div>
            <span className="text-surface-500">Start:</span>{' '}
            <span className="text-surface-200">{format(startDate, 'MMM d, yyyy')}</span>
          </div>
          <div>
            <span className="text-surface-500">Due:</span>{' '}
            <span className="text-surface-200">{format(dueDate, 'MMM d, yyyy')}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onMouseDown={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onMouseDown={handleCreate}
            disabled={!title.trim() || createTask.isPending}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createTask.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
