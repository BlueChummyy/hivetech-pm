import { useMemo, useState, useCallback } from 'react';
import {
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
  startOfWeek,
  startOfMonth,
  format,
  differenceInDays,
  isToday,
  isSameMonth,
} from 'date-fns';
import type { Task } from '@/types/models.types';
import { GanttBar } from './GanttBar';
import { GanttCreatePopover } from './GanttCreatePopover';
import { GanttSchedulePopover } from './GanttSchedulePopover';

export type TimeScale = 'day' | 'week' | 'month';

interface GanttTimelineProps {
  tasks: Task[];
  scale: TimeScale;
  rowHeight: number;
  projectId?: string;
  hoveredRow: string | null;
  onHoverRow: (taskId: string | null) => void;
}

function getColumnWidth(scale: TimeScale): number {
  switch (scale) {
    case 'day':
      return 40;
    case 'week':
      return 120;
    case 'month':
      return 180;
  }
}

function getDateRange(tasks: Task[], scale: TimeScale) {
  const now = new Date();
  let minDate = addMonths(now, -2);
  let maxDate = new Date(now.getFullYear(), 11, 31);

  const lowerBound = addMonths(now, -12);
  const upperBound = addMonths(now, 12);

  tasks.forEach((task) => {
    if (task.startDate) {
      const start = new Date(task.startDate);
      if (start >= lowerBound && start <= upperBound) {
        if (start < minDate) minDate = start;
        if (start > maxDate) maxDate = start;
      }
    }
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      if (due >= lowerBound && due <= upperBound) {
        if (due < minDate) minDate = due;
        if (due > maxDate) maxDate = due;
      }
    }
  });

  minDate = addDays(minDate, -7);
  maxDate = addDays(maxDate, 14);

  switch (scale) {
    case 'day':
      return { start: startOfDay(minDate), end: startOfDay(maxDate) };
    case 'week':
      return { start: startOfWeek(minDate), end: startOfWeek(addWeeks(maxDate, 1)) };
    case 'month':
      return { start: startOfMonth(minDate), end: startOfMonth(addMonths(maxDate, 1)) };
  }
}

function generateColumns(start: Date, end: Date, scale: TimeScale) {
  const columns: Date[] = [];
  let current = start;

  while (current < end) {
    columns.push(current);
    switch (scale) {
      case 'day':
        current = addDays(current, 1);
        break;
      case 'week':
        current = addWeeks(current, 1);
        break;
      case 'month':
        current = addMonths(current, 1);
        break;
    }
  }
  return columns;
}

function formatColumnHeader(date: Date, scale: TimeScale): string {
  switch (scale) {
    case 'day':
      return format(date, 'd');
    case 'week':
      return format(date, 'MMM d');
    case 'month':
      return format(date, 'MMM yyyy');
  }
}

function formatTopHeader(date: Date, scale: TimeScale): string | null {
  switch (scale) {
    case 'day':
      return format(date, 'MMM yyyy');
    case 'week':
      return format(date, 'yyyy');
    case 'month':
      return null;
  }
}

export function GanttTimeline({ tasks, scale, rowHeight, projectId, hoveredRow, onHoverRow }: GanttTimelineProps) {
  const colWidth = getColumnWidth(scale);
  const dateRange = useMemo(() => getDateRange(tasks, scale), [tasks, scale]);
  const columns = useMemo(
    () => generateColumns(dateRange.start, dateRange.end, scale),
    [dateRange, scale],
  );

  const totalWidth = columns.length * colWidth;
  const dayWidth = scale === 'day' ? colWidth : scale === 'week' ? colWidth / 7 : colWidth / 30;

  const todayOffset = differenceInDays(startOfDay(new Date()), dateRange.start) * (scale === 'day' ? colWidth : colWidth / 7);

  const [createPopover, setCreatePopover] = useState<{
    startDate: Date;
    position: { x: number; y: number };
  } | null>(null);

  const [schedulePopover, setSchedulePopover] = useState<{
    taskId: string;
    taskTitle: string;
    startDate: Date;
    position: { x: number; y: number };
  } | null>(null);

  function getTaskPosition(task: Task) {
    if (!task.dueDate) return null;

    const dueDate = new Date(task.dueDate);
    const taskStart = task.startDate ? new Date(task.startDate) : addDays(dueDate, -3);

    const left = differenceInDays(startOfDay(taskStart), dateRange.start) * dayWidth;
    const duration = Math.max(differenceInDays(startOfDay(dueDate), startOfDay(taskStart)), 1);
    const width = duration * dayWidth;

    return { left, width };
  }

  // Click on empty timeline area = create new task
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!projectId) return;
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[data-gantt-bar]') || target.closest('[data-unscheduled-row]')) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left + e.currentTarget.scrollLeft;
      const daysFromStart = Math.floor(clickX / dayWidth);
      const clickDate = addDays(dateRange.start, daysFromStart);

      setCreatePopover({
        startDate: startOfDay(clickDate),
        position: { x: e.clientX, y: e.clientY },
      });
    },
    [projectId, dayWidth, dateRange.start],
  );

  // Click on unscheduled task row = show schedule popover
  const handleScheduleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, task: Task) => {
      e.stopPropagation();
      if (!projectId) return;

      const scrollContainer = e.currentTarget.closest('.overflow-auto');
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left + (scrollContainer?.scrollLeft || 0);
      const daysFromStart = Math.floor(clickX / dayWidth);
      const clickDate = addDays(dateRange.start, daysFromStart);

      setSchedulePopover({
        taskId: task.id,
        taskTitle: task.title,
        startDate: startOfDay(clickDate),
        position: { x: e.clientX, y: e.clientY },
      });
    },
    [projectId, dayWidth, dateRange.start],
  );

  const scheduledTasks = useMemo(() => tasks.filter((t) => t.dueDate), [tasks]);
  const unscheduledTasks = useMemo(() => tasks.filter((t) => !t.dueDate), [tasks]);

  return (
    <div
      className="relative min-h-full"
      style={{ width: `${totalWidth}px` }}
      onClick={handleTimelineClick}
    >
      {/* Top header row (month/year grouping) */}
      {scale === 'day' && (
        <div
          className="sticky top-0 z-10 flex border-b border-surface-700 bg-surface-900"
          style={{ height: `${rowHeight / 2}px` }}
        >
          {columns.map((col, i) => {
            const showLabel = i === 0 || !isSameMonth(col, columns[i - 1]);
            return showLabel ? (
              <div
                key={`top-${i}`}
                className="absolute flex items-center px-2 text-xs font-medium text-surface-400"
                style={{
                  left: `${i * colWidth}px`,
                  height: `${rowHeight / 2}px`,
                }}
              >
                {formatTopHeader(col, scale)}
              </div>
            ) : null;
          })}
        </div>
      )}

      {/* Column headers */}
      <div
        className="sticky z-10 flex border-b border-surface-700 bg-surface-900"
        style={{
          top: scale === 'day' ? `${rowHeight / 2}px` : '0px',
          height: scale === 'day' ? `${rowHeight / 2}px` : `${rowHeight}px`,
        }}
      >
        {columns.map((col, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center justify-center border-r border-surface-700/50 text-xs text-surface-500"
            style={{ width: `${colWidth}px` }}
          >
            <span className={isToday(col) ? 'text-primary-400 font-medium' : ''}>
              {formatColumnHeader(col, scale)}
            </span>
          </div>
        ))}
      </div>

      {/* Grid lines + Task bars */}
      <div className="relative">
        {/* Vertical grid lines */}
        {columns.map((_, i) => (
          <div
            key={`line-${i}`}
            className="absolute top-0 bottom-0 border-r border-surface-700/30"
            style={{ left: `${(i + 1) * colWidth}px` }}
          />
        ))}

        {/* Today marker */}
        {todayOffset >= 0 && todayOffset <= totalWidth && (
          <div
            data-today-marker
            className="absolute top-0 bottom-0 z-20 w-0.5 bg-primary-500/70"
            style={{ left: `${todayOffset}px` }}
          />
        )}

        {/* Scheduled task rows */}
        {scheduledTasks.map((task) => {
          const pos = getTaskPosition(task);
          if (!pos) return null;
          return (
            <div
              key={task.id}
              className="relative border-b border-surface-700/30 transition-colors"
              style={{
                height: `${rowHeight}px`,
                backgroundColor: hoveredRow === task.id ? 'rgba(255,255,255,0.03)' : undefined,
              }}
              onMouseEnter={() => onHoverRow(task.id)}
              onMouseLeave={() => onHoverRow(null)}
            >
              <GanttBar
                task={task}
                left={pos.left}
                width={pos.width}
                rowHeight={rowHeight}
                dayWidth={dayWidth}
                dateRangeStart={dateRange.start}
              />
            </div>
          );
        })}

        {/* Unscheduled task rows - click to schedule */}
        {unscheduledTasks.map((task) => (
          <div
            key={task.id}
            data-unscheduled-row
            className="relative border-b border-surface-700/30 cursor-pointer group/row transition-colors"
            style={{
              height: `${rowHeight}px`,
              background: hoveredRow === task.id
                ? 'rgba(255,255,255,0.03)'
                : 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(255,255,255,0.015) 4px, rgba(255,255,255,0.015) 8px)',
            }}
            onClick={(e) => handleScheduleClick(e, task)}
            onMouseEnter={() => onHoverRow(task.id)}
            onMouseLeave={() => onHoverRow(null)}
            title="Click to schedule this task"
          >
            <div className="absolute inset-0 flex items-center px-3">
              <span className="text-xs text-surface-500 italic truncate">{task.title}</span>
              <span className="ml-2 text-[10px] text-surface-600 opacity-0 group-hover/row:opacity-100 transition-opacity whitespace-nowrap">
                Click to schedule
              </span>
            </div>
          </div>
        ))}

        {/* Empty + Add Task area */}
        {projectId && (
          <div
            className="relative border-b border-surface-700/30 cursor-pointer group/add"
            style={{ height: `${rowHeight}px` }}
            title="Click to create a task"
          >
            <div className="absolute inset-0 flex items-center px-3 gap-1.5 text-surface-500 group-hover/add:text-surface-400 transition-colors">
              <span className="text-xs">+ Add Task</span>
            </div>
          </div>
        )}
      </div>

      {/* Create popover */}
      {createPopover && projectId && (
        <GanttCreatePopover
          projectId={projectId}
          startDate={createPopover.startDate}
          position={createPopover.position}
          onClose={() => setCreatePopover(null)}
        />
      )}

      {/* Schedule popover */}
      {schedulePopover && (
        <GanttSchedulePopover
          taskId={schedulePopover.taskId}
          taskTitle={schedulePopover.taskTitle}
          startDate={schedulePopover.startDate}
          position={schedulePopover.position}
          onClose={() => setSchedulePopover(null)}
        />
      )}
    </div>
  );
}
