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

export type TimeScale = 'day' | 'week' | 'month';

interface GanttTimelineProps {
  tasks: Task[];
  scale: TimeScale;
  rowHeight: number;
  projectId?: string;
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
  let maxDate = new Date(now.getFullYear(), 11, 31); // End of current year

  // Only extend range for task dates within a reasonable window (±12 months)
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

  // Add padding
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

export function GanttTimeline({ tasks, scale, rowHeight, projectId }: GanttTimelineProps) {
  const colWidth = getColumnWidth(scale);
  const dateRange = useMemo(() => getDateRange(tasks, scale), [tasks, scale]);
  const columns = useMemo(
    () => generateColumns(dateRange.start, dateRange.end, scale),
    [dateRange, scale],
  );

  const totalWidth = columns.length * colWidth;
  const dayWidth = scale === 'day' ? colWidth : scale === 'week' ? colWidth / 7 : colWidth / 30;

  // Today marker position
  const todayOffset = differenceInDays(startOfDay(new Date()), dateRange.start) * (scale === 'day' ? colWidth : colWidth / 7);

  // Click-to-create state
  const [createPopover, setCreatePopover] = useState<{
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

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!projectId) return;

      // Only trigger on clicks directly on the timeline area (not on bars)
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[data-gantt-bar]')) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left + e.currentTarget.scrollLeft;

      // Calculate date from click position
      const daysFromStart = Math.floor(clickX / dayWidth);
      const clickDate = addDays(dateRange.start, daysFromStart);

      setCreatePopover({
        startDate: startOfDay(clickDate),
        position: { x: e.clientX, y: e.clientY },
      });
    },
    [projectId, dayWidth, dateRange.start],
  );

  const scheduledTasks = tasks.filter((t) => t.dueDate);
  const unscheduledTasks = tasks.filter((t) => !t.dueDate);

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
            className="absolute top-0 bottom-0 z-20 w-0.5 bg-primary-500/70"
            style={{ left: `${todayOffset}px` }}
          />
        )}

        {/* Task rows */}
        {scheduledTasks.map((task) => {
          const pos = getTaskPosition(task);
          if (!pos) return null;
          return (
            <div
              key={task.id}
              className="relative border-b border-surface-700/30"
              style={{ height: `${rowHeight}px` }}
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

        {/* Unscheduled section */}
        {unscheduledTasks.length > 0 && (
          <>
            <div
              className="flex items-center px-3 text-xs font-medium text-surface-500 bg-surface-900/50 border-y border-surface-700"
              style={{ height: `${rowHeight}px` }}
            >
              Unscheduled ({unscheduledTasks.length})
            </div>
            {unscheduledTasks.map((task) => (
              <div
                key={task.id}
                className="relative border-b border-surface-700/30"
                style={{ height: `${rowHeight}px` }}
              >
                <GanttBar
                  task={task}
                  left={8}
                  width={120}
                  rowHeight={rowHeight}
                />
              </div>
            ))}
          </>
        )}

        {/* Empty area hint for click-to-create */}
        {projectId && tasks.length === 0 && (
          <div
            className="flex items-center justify-center text-xs text-surface-500"
            style={{ height: `${rowHeight * 3}px` }}
          >
            Click anywhere on the timeline to create a task
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
    </div>
  );
}
