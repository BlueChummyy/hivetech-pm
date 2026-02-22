import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import type { Task } from '@/types/models.types';
import { StatusCategory } from '@/types/models.types';
import { useUIStore } from '@/store/ui.store';
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';
import { Avatar } from '@/components/ui/Avatar';

interface SubtaskListProps {
  parentTask: Task;
  subtasks: Task[];
  doneStatusId?: string;
}

export function SubtaskList({ parentTask, subtasks, doneStatusId }: SubtaskListProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const openTaskPanel = useUIStore((s) => s.openTaskPanel);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { toast } = useToast();

  const completedCount = subtasks.filter(
    (t) => t.status?.category === StatusCategory.DONE || t.status?.category === StatusCategory.CANCELLED,
  ).length;

  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  function handleToggle(subtask: Task) {
    if (!doneStatusId) return;
    const isDone =
      subtask.status?.category === StatusCategory.DONE ||
      subtask.status?.category === StatusCategory.CANCELLED;

    if (isDone) {
      updateTask.mutate({
        id: subtask.id,
        data: { statusId: parentTask.statusId },
      });
    } else {
      updateTask.mutate({
        id: subtask.id,
        data: { statusId: doneStatusId },
      });
    }
  }

  function handleAdd() {
    if (!newTitle.trim()) return;
    createTask.mutate(
      {
        projectId: parentTask.projectId,
        statusId: parentTask.statusId,
        title: newTitle.trim(),
        parentId: parentTask.id,
      },
      {
        onSuccess: () => {
          setNewTitle('');
          setAdding(false);
        },
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to create subtask', description: (err as Error).message });
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-surface-300">Subtasks</h4>
        <span className="text-xs text-surface-500">
          {completedCount} of {subtasks.length} complete
        </span>
      </div>

      {subtasks.length > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-700">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="space-y-1">
        {subtasks.map((subtask) => {
          const isDone =
            subtask.status?.category === StatusCategory.DONE ||
            subtask.status?.category === StatusCategory.CANCELLED;
          return (
            <div
              key={subtask.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-700/50 group"
            >
              <button
                onClick={() => handleToggle(subtask)}
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                  isDone
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-surface-600 hover:border-surface-500',
                )}
              >
                {isDone && <Check className="h-3 w-3" />}
              </button>
              <button
                onClick={() => openTaskPanel(subtask.id)}
                className={cn(
                  'flex-1 text-left text-sm truncate transition-colors',
                  isDone ? 'text-surface-500 line-through' : 'text-surface-200',
                )}
              >
                {subtask.title}
              </button>
              {subtask.assigneeId && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Avatar src={subtask.assignee?.avatarUrl} name={subtask.assignee?.name || subtask.assignee?.displayName} size="sm" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {adding ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') {
                setAdding(false);
                setNewTitle('');
              }
            }}
            placeholder="Subtask title..."
            className="flex-1 rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1.5 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim() || createTask.isPending}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={() => {
              setAdding(false);
              setNewTitle('');
            }}
            className="rounded-md px-3 py-1.5 text-sm text-surface-400 hover:text-surface-200"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-300 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add subtask</span>
        </button>
      )}
    </div>
  );
}
