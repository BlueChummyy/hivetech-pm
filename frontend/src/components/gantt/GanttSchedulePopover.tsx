import { useState, useRef, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Calendar, X } from 'lucide-react';
import { useUpdateTask } from '@/hooks/useTasks';

interface GanttSchedulePopoverProps {
  taskId: string;
  taskTitle: string;
  startDate: Date;
  position: { x: number; y: number };
  onClose: () => void;
}

export function GanttSchedulePopover({
  taskId,
  taskTitle,
  startDate,
  position,
  onClose,
}: GanttSchedulePopoverProps) {
  const [sd, setSd] = useState(format(startDate, 'yyyy-MM-dd'));
  const [dd, setDd] = useState(format(addDays(startDate, 3), 'yyyy-MM-dd'));
  const ref = useRef<HTMLDivElement>(null);
  const updateTask = useUpdateTask();

  // Close on outside click or escape
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchstart', handleMouseDown as EventListener);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchstart', handleMouseDown as EventListener);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleConfirm = () => {
    if (!sd || !dd) return;
    updateTask.mutate({
      id: taskId,
      data: {
        startDate: new Date(sd).toISOString(),
        dueDate: new Date(dd).toISOString(),
      },
    });
    onClose();
  };

  // Position the popover near the click point
  const top = position.y + 8;
  const left = position.x - 140;

  return (
    <div
      ref={ref}
      className="fixed z-50 w-[280px] rounded-xl border border-surface-700 bg-surface-800 shadow-xl"
      style={{ top: `${top}px`, left: `${Math.max(8, left)}px` }}
    >
      <div className="flex items-center justify-between border-b border-surface-700 px-3 py-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar className="h-3.5 w-3.5 text-primary-400 shrink-0" />
          <span className="text-sm font-medium text-surface-200 truncate">{taskTitle}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-surface-500 hover:text-surface-200 hover:bg-surface-700 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">Start Date</label>
          <input
            type="date"
            value={sd}
            onChange={(e) => setSd(e.target.value)}
            className="w-full rounded-md border border-surface-600 bg-surface-900 px-2.5 py-1.5 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">Due Date</label>
          <input
            type="date"
            value={dd}
            onChange={(e) => setDd(e.target.value)}
            className="w-full rounded-md border border-surface-600 bg-surface-900 px-2.5 py-1.5 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-surface-600 px-3 py-1.5 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!sd || !dd}
            className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
