import { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import type { Task } from '@/types/models.types';
import { Priority } from '@/types/models.types';
import { useUIStore } from '@/store/ui.store';
import { useUpdateTask } from '@/hooks/useTasks';

const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.URGENT]: '#EF4444',
  [Priority.HIGH]: '#F97316',
  [Priority.MEDIUM]: '#EAB308',
  [Priority.LOW]: '#3B82F6',
  [Priority.NONE]: '#6366F1',
};

interface GanttBarProps {
  task: Task;
  left: number;
  width: number;
  rowHeight: number;
  dayWidth?: number;
  dateRangeStart?: Date;
}

export function GanttBar({ task, left, width, rowHeight, dayWidth, dateRangeStart }: GanttBarProps) {
  const openTaskPanel = useUIStore((s) => s.openTaskPanel);
  const updateTask = useUpdateTask();
  const barColor = task.status?.color || PRIORITY_COLORS[task.priority] || '#6366F1';

  const [dragState, setDragState] = useState<{
    side: 'left' | 'right';
    deltaX: number;
  } | null>(null);

  const dragStartX = useRef(0);
  const isDragging = useRef(false);

  const canResize = !!dayWidth && !!dateRangeStart && !!task.dueDate;

  const handleDragStart = useCallback(
    (side: 'left' | 'right', e: React.MouseEvent) => {
      if (!canResize) return;
      e.stopPropagation();
      e.preventDefault();
      isDragging.current = true;
      dragStartX.current = e.clientX;

      function handleMouseMove(ev: MouseEvent) {
        const delta = ev.clientX - dragStartX.current;
        setDragState({ side, deltaX: delta });
      }

      function handleMouseUp(ev: MouseEvent) {
        isDragging.current = false;
        const delta = ev.clientX - dragStartX.current;
        setDragState(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        if (Math.abs(delta) < 3) return; // ignore tiny drags

        const daysDelta = Math.round(delta / dayWidth!);
        if (daysDelta === 0) return;

        const dueDate = new Date(task.dueDate!);
        const startDate = task.startDate ? new Date(task.startDate) : new Date(dueDate);
        startDate.setDate(startDate.getDate() - 3);

        const updateData: { startDate?: string; dueDate?: string } = {};

        if (side === 'left') {
          const newStart = new Date(startDate);
          newStart.setDate(newStart.getDate() + daysDelta);
          // Don't allow start after due
          if (newStart < dueDate) {
            updateData.startDate = newStart.toISOString();
          }
        } else {
          const newDue = new Date(dueDate);
          newDue.setDate(newDue.getDate() + daysDelta);
          // Don't allow due before start
          if (newDue > startDate) {
            updateData.dueDate = newDue.toISOString();
          }
        }

        if (Object.keys(updateData).length > 0) {
          updateTask.mutate({ id: task.id, data: updateData });
        }
      }

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [canResize, dayWidth, task, updateTask],
  );

  // Calculate adjusted positions during drag
  let adjustedLeft = left;
  let adjustedWidth = Math.max(width, 24);

  if (dragState) {
    if (dragState.side === 'left') {
      adjustedLeft = left + dragState.deltaX;
      adjustedWidth = Math.max(width - dragState.deltaX, 24);
    } else {
      adjustedWidth = Math.max(width + dragState.deltaX, 24);
    }
  }

  // Calculate tooltip date during drag
  let tooltipDate: string | null = null;
  if (dragState && dayWidth && dateRangeStart) {
    if (dragState.side === 'left') {
      const daysFromStart = Math.round(adjustedLeft / dayWidth);
      const date = new Date(dateRangeStart);
      date.setDate(date.getDate() + daysFromStart);
      tooltipDate = format(date, 'MMM d, yyyy');
    } else {
      const daysFromStart = Math.round((adjustedLeft + adjustedWidth) / dayWidth);
      const date = new Date(dateRangeStart);
      date.setDate(date.getDate() + daysFromStart);
      tooltipDate = format(date, 'MMM d, yyyy');
    }
  }

  return (
    <div
      className="absolute group"
      style={{
        left: `${adjustedLeft}px`,
        width: `${adjustedWidth}px`,
        height: `${rowHeight - 12}px`,
        top: '6px',
      }}
    >
      {/* Left resize handle */}
      {canResize && (
        <div
          onMouseDown={(e) => handleDragStart('left', e)}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ borderRadius: '6px 0 0 6px' }}
        >
          <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-white/60" />
        </div>
      )}

      {/* Main bar */}
      <button
        onClick={() => {
          if (!isDragging.current) openTaskPanel(task.id);
        }}
        className="flex items-center w-full h-full rounded-md px-2 text-xs font-medium text-white truncate transition-opacity hover:opacity-90 cursor-pointer"
        style={{ backgroundColor: barColor }}
        title={task.title}
      >
        <span className="truncate">{task.title}</span>
      </button>

      {/* Right resize handle */}
      {canResize && (
        <div
          onMouseDown={(e) => handleDragStart('right', e)}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ borderRadius: '0 6px 6px 0' }}
        >
          <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-white/60" />
        </div>
      )}

      {/* Drag tooltip */}
      {tooltipDate && (
        <div
          className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-surface-900 border border-surface-600 px-2 py-0.5 text-[10px] text-surface-200 shadow-lg z-30 pointer-events-none"
        >
          {tooltipDate}
        </div>
      )}
    </div>
  );
}
