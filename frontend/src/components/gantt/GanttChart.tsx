import { useState, useRef, useCallback, useEffect } from 'react';
import type { Task } from '@/types/models.types';
import { GanttTaskList } from './GanttTaskList';
import { GanttTimeline, type TimeScale } from './GanttTimeline';
import { cn } from '@/utils/cn';

interface GanttChartProps {
  tasks: Task[];
  isLoading?: boolean;
  projectId?: string;
}

const ROW_HEIGHT = 40;
const SCALE_OPTIONS: { value: TimeScale; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

// Exported for external use
export { ROW_HEIGHT as GANTT_ROW_HEIGHT };

export function GanttChart({ tasks, isLoading, projectId }: GanttChartProps) {
  const [scale, setScale] = useState<TimeScale>('week');
  const [listWidth, setListWidth] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 160 : 340,
  );
  const [isResizing, setIsResizing] = useState(false);
  const [grabCursor, setGrabCursor] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isGrabbingRef = useRef(false);
  const didDragRef = useRef(false);
  const grabStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

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

  // Grab-to-scroll: left-click drag on empty areas scrolls the timeline.
  // Also kills the browser's middle-click auto-scroll circle entirely.
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;

    const DRAG_THRESHOLD = 4; // px — movement beyond this = drag, not click

    function onPointerDown(e: PointerEvent) {
      // Kill middle-click auto-scroll circle
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.button !== 0) return;
      // Don't grab when clicking interactive elements
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[data-gantt-bar]') || target.closest('input') || target.closest('[data-unscheduled-row]')) return;

      didDragRef.current = false;
      isGrabbingRef.current = true;
      grabStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
      };
    }

    function onPointerMove(e: PointerEvent) {
      if (!isGrabbingRef.current) return;
      const dx = e.clientX - grabStartRef.current.x;
      const dy = e.clientY - grabStartRef.current.y;

      // Only start visual drag after threshold
      if (!didDragRef.current && Math.abs(dx) + Math.abs(dy) >= DRAG_THRESHOLD) {
        didDragRef.current = true;
        setGrabCursor(true);
      }

      if (didDragRef.current) {
        el.scrollLeft = grabStartRef.current.scrollLeft - dx;
        el.scrollTop = grabStartRef.current.scrollTop - dy;
      }
    }

    function onPointerUp() {
      if (isGrabbingRef.current) {
        isGrabbingRef.current = false;
        setGrabCursor(false);
      }
    }

    // Suppress click events that follow a drag so popovers don't open
    function onClickCapture(e: MouseEvent) {
      if (didDragRef.current) {
        e.stopPropagation();
        e.preventDefault();
        didDragRef.current = false;
      }
    }

    // Prevent middle-click default at every level
    function onAuxClick(e: MouseEvent) {
      if (e.button === 1) { e.preventDefault(); e.stopPropagation(); }
    }
    function onMiddleDown(e: MouseEvent) {
      if (e.button === 1) { e.preventDefault(); e.stopPropagation(); }
    }

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('mousedown', onMiddleDown);
    el.addEventListener('auxclick', onAuxClick);
    el.addEventListener('click', onClickCapture, true); // capture phase
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('mousedown', onMiddleDown);
      el.removeEventListener('auxclick', onAuxClick);
      el.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const scrollToToday = useCallback(() => {
    if (!timelineRef.current) return;
    const scrollContainer = timelineRef.current;
    const todayMarker = scrollContainer.querySelector('[data-today-marker]') as HTMLElement;
    if (todayMarker) {
      const offset = parseInt(todayMarker.style.left, 10) || 0;
      scrollContainer.scrollTo({ left: Math.max(0, offset - scrollContainer.clientWidth / 3), behavior: 'smooth' });
    }
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

  // Sort: scheduled first, then by start date / due date
  const sortedTasks = [...tasks].sort((a, b) => {
    const aHasDate = !!(a.startDate || a.dueDate);
    const bHasDate = !!(b.startDate || b.dueDate);
    if (aHasDate && !bHasDate) return -1;
    if (!aHasDate && bHasDate) return 1;
    const aStart = a.startDate || a.dueDate || '';
    const bStart = b.startDate || b.dueDate || '';
    if (aStart && bStart) return aStart.localeCompare(bStart);
    return a.position - b.position;
  });

  return (
    <div className="space-y-3">
      {/* Scale toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={scrollToToday}
          className="rounded-md border border-surface-700 bg-surface-800 px-3 py-1 text-sm text-surface-300 hover:text-surface-100 transition-colors"
        >
          Today
        </button>
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
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className={cn(
          'flex h-[400px] sm:h-[500px] lg:h-[600px] 4xl:h-[800px] overflow-hidden rounded-xl border border-surface-700 bg-surface-900',
          isResizing && 'select-none',
        )}
      >
        {/* Left panel: Task list (hidden on very small screens) */}
        <div
          className="hidden sm:block shrink-0 overflow-y-auto border-r border-surface-700 bg-surface-800"
          style={{ width: `${listWidth}px` }}
        >
          <GanttTaskList tasks={sortedTasks} rowHeight={ROW_HEIGHT} hoveredRow={hoveredRow} onHoverRow={setHoveredRow} />
        </div>

        {/* Resize handle (hidden on mobile) */}
        <div
          onMouseDown={handleMouseDown}
          className="hidden sm:block w-1 shrink-0 cursor-col-resize bg-surface-700 hover:bg-primary-500/50 transition-colors"
        />

        {/* Right panel: Timeline */}
        <div ref={timelineRef} className={cn('flex-1 overflow-auto scrollbar-thin cursor-grab', grabCursor && 'cursor-grabbing select-none')}>
          <GanttTimeline tasks={sortedTasks} scale={scale} rowHeight={ROW_HEIGHT} projectId={projectId} hoveredRow={hoveredRow} onHoverRow={setHoveredRow} />
        </div>
      </div>
    </div>
  );
}
