import { useState, useRef, useCallback } from 'react';
import type { Task } from '@/types/models.types';
import { GanttTaskList } from './GanttTaskList';
import { GanttTimeline, type TimeScale } from './GanttTimeline';
import { cn } from '@/utils/cn';

interface GanttChartProps {
  tasks: Task[];
  isLoading?: boolean;
}

const ROW_HEIGHT = 40;
const SCALE_OPTIONS: { value: TimeScale; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export function GanttChart({ tasks, isLoading }: GanttChartProps) {
  const [scale, setScale] = useState<TimeScale>('week');
  const [listWidth, setListWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsResizing(true);

    function handleMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(180, Math.min(500, e.clientX - rect.left));
      setListWidth(newWidth);
    }

    function handleMouseUp() {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-700 border-t-primary-500" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-800">
        <p className="text-surface-400">No tasks to display</p>
        <p className="text-sm text-surface-500">
          Create tasks with due dates to see them on the timeline
        </p>
      </div>
    );
  }

  // Sort: scheduled first, then by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return a.sortOrder - b.sortOrder;
  });

  return (
    <div className="space-y-3">
      {/* Scale toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-surface-800 p-1 w-fit border border-surface-700">
        {SCALE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setScale(opt.value)}
            className={cn(
              'rounded-md px-3 py-1 text-sm font-medium transition-colors',
              scale === opt.value
                ? 'bg-primary-600 text-white'
                : 'text-surface-400 hover:text-surface-200',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className={cn(
          'flex h-[600px] overflow-hidden rounded-xl border border-surface-700 bg-surface-900',
          isResizing && 'select-none',
        )}
      >
        {/* Left panel: Task list */}
        <div
          className="shrink-0 overflow-y-auto border-r border-surface-700 bg-surface-800"
          style={{ width: `${listWidth}px` }}
        >
          <GanttTaskList tasks={sortedTasks} rowHeight={ROW_HEIGHT} />
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1 shrink-0 cursor-col-resize bg-surface-700 hover:bg-primary-500/50 transition-colors"
        />

        {/* Right panel: Timeline */}
        <div className="flex-1 overflow-auto">
          <GanttTimeline tasks={sortedTasks} scale={scale} rowHeight={ROW_HEIGHT} />
        </div>
      </div>
    </div>
  );
}
