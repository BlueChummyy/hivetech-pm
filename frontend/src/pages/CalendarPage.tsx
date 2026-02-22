import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTasks } from '@/hooks/useTasks';
import { useProject } from '@/hooks/useProjects';
import { useUIStore } from '@/store/ui.store';
import { PageError } from '@/components/ui/PageError';
import type { Task } from '@/types/models.types';
import { Priority } from '@/types/models.types';

const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.URGENT]: '#EF4444',
  [Priority.HIGH]: '#F97316',
  [Priority.MEDIUM]: '#EAB308',
  [Priority.LOW]: '#3B82F6',
  [Priority.NONE]: '#6366F1',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId || '');
  const { data: tasks, isLoading, isError, error, refetch } = useTasks({ projectId: projectId ?? '' });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const openTaskPanel = useUIStore((s) => s.openTaskPanel);

  // 3-year range limit
  const now = new Date();
  const minMonth = subMonths(startOfMonth(now), 6);
  const maxMonth = addMonths(startOfMonth(now), 36);

  const canGoPrev = startOfMonth(subMonths(currentMonth, 1)) >= minMonth;
  const canGoNext = startOfMonth(addMonths(currentMonth, 1)) <= maxMonth;

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Map tasks to dates by dueDate
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    (tasks ?? []).forEach((task) => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
        const existing = map.get(dateKey) ?? [];
        existing.push(task);
        map.set(dateKey, existing);
      }
    });
    return map;
  }, [tasks]);

  if (isError) {
    return (
      <PageError
        message={(error as Error)?.message || 'Failed to load tasks'}
        onRetry={refetch}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-700 border-t-primary-500" />
      </div>
    );
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">
            {project?.name || 'Project'} - Calendar
          </h1>
          <p className="text-sm text-surface-500">Task schedule overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-300 hover:text-surface-100 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => canGoPrev && setCurrentMonth(subMonths(currentMonth, 1))}
              disabled={!canGoPrev}
              className="rounded-md p-1.5 text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[160px] text-center text-lg font-semibold text-surface-100">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => canGoNext && setCurrentMonth(addMonths(currentMonth, 1))}
              disabled={!canGoNext}
              className="rounded-md p-1.5 text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-hidden rounded-xl border border-surface-700 bg-surface-900">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-surface-700 bg-surface-800">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2 text-center text-xs font-medium text-surface-500">
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="grid auto-rows-fr" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(100px, 1fr))` }}>
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 border-b border-surface-700/50 last:border-b-0">
              {week.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayTasks = tasksByDate.get(dateKey) ?? [];
                const inCurrentMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);

                return (
                  <div
                    key={dateKey}
                    className={cn(
                      'border-r border-surface-700/30 last:border-r-0 p-1 overflow-hidden',
                      !inCurrentMonth && 'bg-surface-900/50',
                    )}
                  >
                    <div className="flex items-center justify-center mb-1">
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                          today
                            ? 'bg-primary-600 text-white font-semibold'
                            : inCurrentMonth
                              ? 'text-surface-300'
                              : 'text-surface-600',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="space-y-0.5 overflow-y-auto max-h-[calc(100%-28px)]">
                      {dayTasks.slice(0, 3).map((task) => {
                        const color = task.status?.color || PRIORITY_COLORS[task.priority] || '#6366F1';
                        return (
                          <button
                            key={task.id}
                            onClick={() => openTaskPanel(task.id)}
                            className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-[10px] text-white truncate hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: `${color}40` }}
                            title={task.title}
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="truncate" style={{ color }}>
                              {task.title}
                            </span>
                          </button>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <span className="block text-center text-[10px] text-surface-500">
                          +{dayTasks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
