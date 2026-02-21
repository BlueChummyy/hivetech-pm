import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/ui.store';
import type { Task, Priority } from '@/types/models.types';

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

interface KanbanCardProps {
  task: Task;
  overlay?: boolean;
}

export function KanbanCard({ task, overlay }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const subtasks = task.subtasks ?? [];
  const completedSubtasks = subtasks.filter((s) => s.completedAt).length;
  const commentCount = task.comments?.length ?? 0;

  const handleClick = () => {
    useUIStore.getState().openTaskPanel(task.id);
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={handleClick}
      role="article"
      aria-label={task.title}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'cursor-pointer rounded-lg border border-white/[0.08] bg-[#1E1E26] p-3 transition-colors hover:bg-[#252530]',
        isDragging && 'opacity-50',
        overlay && 'shadow-xl shadow-black/40 rotate-2',
      )}
    >
      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
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

      {/* Title */}
      <p className="text-sm font-medium text-white leading-snug">{task.title}</p>

      {/* Identifier */}
      <p className="mt-1 text-xs text-gray-400">{task.identifier}</p>

      {/* Bottom row: metadata */}
      <div className="mt-3 flex items-center gap-3">
        {/* Priority */}
        {task.priority !== 'NONE' && (
          <div className="flex items-center gap-1" title={PRIORITY_LABELS[task.priority]}>
            <span className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[task.priority])} />
            <span className="text-[10px] text-gray-400">{PRIORITY_LABELS[task.priority]}</span>
          </div>
        )}

        {/* Due date */}
        {task.dueDate && (
          <div className="flex items-center gap-1 text-gray-400">
            <Calendar className="h-3 w-3" />
            <span className="text-[10px]">{format(new Date(task.dueDate), 'MMM d')}</span>
          </div>
        )}

        {/* Subtask progress */}
        {subtasks.length > 0 && (
          <span className="text-[10px] text-gray-400">
            {completedSubtasks}/{subtasks.length}
          </span>
        )}

        {/* Comments */}
        {commentCount > 0 && (
          <div className="flex items-center gap-1 text-gray-400">
            <MessageSquare className="h-3 w-3" />
            <span className="text-[10px]">{commentCount}</span>
          </div>
        )}

        {/* Assignee avatar (pushed to the right) */}
        {task.assignee && (
          <div className="ml-auto" title={task.assignee.name}>
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
          </div>
        )}
      </div>
    </div>
  );
}
