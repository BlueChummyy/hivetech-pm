import { ChevronRight, CalendarClock } from 'lucide-react';
import type { Task } from '@/types/models.types';
import { useUIStore } from '@/store/ui.store';
import { Avatar } from '@/components/ui/Avatar';

interface GanttTaskListProps {
  tasks: Task[];
  rowHeight: number;
  hoveredRow: string | null;
  onHoverRow: (taskId: string | null) => void;
}

export function GanttTaskList({ tasks, rowHeight, hoveredRow, onHoverRow }: GanttTaskListProps) {
  const openTaskPanel = useUIStore((s) => s.openTaskPanel);

  const scheduled = tasks.filter((t) => t.dueDate);
  const unscheduled = tasks.filter((t) => !t.dueDate);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center border-b border-surface-700 bg-surface-900 px-3 text-xs font-medium text-surface-500"
        style={{ height: `${rowHeight}px` }}
      >
        <span className="flex-1 min-w-0">Task</span>
        <span className="w-24 shrink-0 text-center">Assignee</span>
      </div>

      {/* Scheduled task rows */}
      {scheduled.map((task) => (
        <div
          key={task.id}
          className="flex items-center border-b border-surface-700/50 px-3 transition-colors"
          style={{
            height: `${rowHeight}px`,
            backgroundColor: hoveredRow === task.id ? 'rgba(255,255,255,0.03)' : undefined,
          }}
          onMouseEnter={() => onHoverRow(task.id)}
          onMouseLeave={() => onHoverRow(null)}
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
          <div className="w-24 shrink-0 flex items-center justify-center gap-1.5">
            {task.assigneeId ? (
              <>
                <Avatar
                  src={task.assignee?.avatarUrl}
                  name={task.assignee?.name || task.assignee?.displayName}
                  size="sm"
                />
                <span className="text-xs text-surface-300 truncate max-w-[60px]">
                  {task.assignee?.name || task.assignee?.displayName || ''}
                </span>
              </>
            ) : (
              <span className="text-xs text-surface-500">--</span>
            )}
          </div>
        </div>
      ))}

      {/* Unscheduled task rows */}
      {unscheduled.map((task) => (
        <div
          key={task.id}
          className="flex items-center border-b border-surface-700/50 px-3 transition-colors"
          style={{
            height: `${rowHeight}px`,
            backgroundColor: hoveredRow === task.id ? 'rgba(255,255,255,0.03)' : undefined,
          }}
          onMouseEnter={() => onHoverRow(task.id)}
          onMouseLeave={() => onHoverRow(null)}
        >
          <button
            onClick={() => openTaskPanel(task.id)}
            className="flex-1 flex items-center gap-1.5 min-w-0"
          >
            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-surface-500" />
            <span className="text-sm text-surface-400 truncate italic">
              {task.title}
            </span>
          </button>
          <div className="w-24 shrink-0 flex items-center justify-center gap-1.5">
            {task.assigneeId ? (
              <>
                <Avatar
                  src={task.assignee?.avatarUrl}
                  name={task.assignee?.name || task.assignee?.displayName}
                  size="sm"
                />
                <span className="text-xs text-surface-300 truncate max-w-[60px]">
                  {task.assignee?.name || task.assignee?.displayName || ''}
                </span>
              </>
            ) : (
              <span className="text-xs text-surface-500">--</span>
            )}
          </div>
        </div>
      ))}

      {/* + Add Task row */}
      <div
        className="flex items-center border-b border-surface-700/50 px-3 text-surface-500"
        style={{ height: `${rowHeight}px` }}
      >
        <span className="text-xs">+ Add Task</span>
      </div>
    </div>
  );
}
