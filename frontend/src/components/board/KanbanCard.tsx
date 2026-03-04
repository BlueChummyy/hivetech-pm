import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare, Paperclip, ListChecks, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/ui.store';
import { Avatar } from '@/components/ui/Avatar';
import { TaskContextMenu } from '@/components/TaskContextMenu';
import type { Task, Priority } from '@/types/models.types';

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
  const completedSubtasks = subtasks.filter((s) => s.status?.category === 'DONE').length;
  const commentCount = task.comments?.length ?? task._count?.comments ?? 0;
  const attachmentCount = task.attachments?.length ?? task._count?.attachments ?? 0;

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
      draggable={!overlay}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/task-id', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'group/card relative cursor-pointer rounded-lg border border-white/[0.08] bg-[#1E1E26] p-3 transition-colors hover:bg-[#252530] touch-manipulation',
        isDragging && 'opacity-50',
        overlay && 'shadow-xl shadow-black/40 rotate-2',
        task.closedAt && 'opacity-50',
      )}
    >
      {/* Context menu - top right, visible on hover */}
      {!overlay && (
        <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
          <TaskContextMenu task={task} />
        </div>
      )}

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
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

      {/* Title */}
      <p className={cn('text-sm font-medium text-white leading-snug', task.closedAt && 'line-through text-gray-400')}>{task.title}</p>

      {/* Task number + closed badge */}
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-xs text-gray-400">#{task.taskNumber}</span>
        {task.closedAt && (
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
            CLOSED
          </span>
        )}
      </div>

      {/* Bottom row: metadata */}
      <div className="mt-3 flex items-center gap-3">
        {/* Priority */}
        {task.priority !== 'NONE' && (
          <div className="flex items-center gap-1" title={PRIORITY_LABELS[task.priority]}>
            <Flag className="h-3 w-3" style={{ color: PRIORITY_COLORS[task.priority] }} fill="currentColor" />
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
          <div className="flex items-center gap-1 text-gray-400">
            <ListChecks className="h-3 w-3" />
            <span className="text-[10px]">
              {completedSubtasks}/{subtasks.length}
            </span>
          </div>
        )}

        {/* Comments */}
        {commentCount > 0 && (
          <div className="flex items-center gap-1 text-gray-400">
            <MessageSquare className="h-3 w-3" />
            <span className="text-[10px]">{commentCount}</span>
          </div>
        )}

        {/* Attachments */}
        {attachmentCount > 0 && (
          <div className="flex items-center gap-1 text-gray-400">
            <Paperclip className="h-3 w-3" />
            <span className="text-[10px]">{attachmentCount}</span>
          </div>
        )}

        {/* Assignee avatar(s) (pushed to the right) */}
        {(task.assignees && task.assignees.length > 0) ? (
          <div className="ml-auto flex -space-x-1.5" title={task.assignees.map((a) => a.user?.name || a.user?.displayName).join(', ')}>
            {task.assignees.slice(0, 3).map((a) => {
              const user = a.user;
              if (!user) return null;
              return (
                <Avatar
                  key={a.id}
                  src={user.avatarUrl}
                  name={user.name || user.displayName}
                  size="sm"
                  className="ring-1 ring-[#1E1E26]"
                />
              );
            })}
            {task.assignees.length > 3 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-600 text-[10px] font-medium text-white ring-1 ring-[#1E1E26]">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        ) : task.assignee ? (
          <div className="ml-auto" title={task.assignee.name || task.assignee.displayName}>
            <Avatar
              src={task.assignee.avatarUrl}
              name={task.assignee.name || task.assignee.displayName}
              size="sm"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
