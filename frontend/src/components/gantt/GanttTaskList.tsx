import { ChevronRight, UserCircle } from 'lucide-react';
import type { Task } from '@/types/models.types';
import { useUIStore } from '@/store/ui.store';

interface GanttTaskListProps {
  tasks: Task[];
  rowHeight: number;
}

export function GanttTaskList({ tasks, rowHeight }: GanttTaskListProps) {
  const openTaskPanel = useUIStore((s) => s.openTaskPanel);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center border-b border-surface-700 bg-surface-900 px-3 text-xs font-medium text-surface-500"
        style={{ height: `${rowHeight}px` }}
      >
        <span className="flex-1">Task</span>
        <span className="w-8 text-center">Assignee</span>
      </div>

      {/* Rows */}
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center border-b border-surface-700/50 px-3 hover:bg-surface-800/50 transition-colors"
          style={{ height: `${rowHeight}px` }}
        >
          <button
            onClick={() => openTaskPanel(task.id)}
            className="flex-1 flex items-center gap-1.5 min-w-0"
          >
            {task.subtasks && task.subtasks.length > 0 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-surface-500" />
            )}
            <span className="text-sm text-surface-200 truncate">
              {task.title}
            </span>
          </button>
          <div className="w-8 flex justify-center">
            {task.assignee?.avatarUrl ? (
              <img
                src={task.assignee.avatarUrl}
                alt=""
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : task.assigneeId ? (
              <UserCircle className="h-5 w-5 text-surface-500" />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
