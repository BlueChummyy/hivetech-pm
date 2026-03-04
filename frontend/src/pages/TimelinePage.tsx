import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
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
} from 'date-fns';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTasks } from '@/hooks/useTasks';
import { useProject } from '@/hooks/useProjects';
import { useProjectMembers } from '@/hooks/useMembers';
import { useProjectPermissions } from '@/hooks/useProjectRole';
import { useUIStore } from '@/store/ui.store';
import { PageError } from '@/components/ui/PageError';
import { Avatar } from '@/components/ui/Avatar';
import type { Task, User } from '@/types/models.types';
import { Priority } from '@/types/models.types';

type TimeScale = 'day' | 'week' | 'month';

const SCALE_OPTIONS: { value: TimeScale; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const ROW_HEIGHT = 48;

const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.URGENT]: '#EF4444',
  [Priority.HIGH]: '#F97316',
  [Priority.MEDIUM]: '#EAB308',
  [Priority.LOW]: '#3B82F6',
  [Priority.NONE]: '#6366F1',
};

function getColumnWidth(scale: TimeScale): number {
  switch (scale) {
    case 'day': return 40;
    case 'week': return 120;
    case 'month': return 180;
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
    case 'day': return { start: startOfDay(minDate), end: startOfDay(maxDate) };
    case 'week': return { start: startOfWeek(minDate), end: startOfWeek(addWeeks(maxDate, 1)) };
    case 'month': return { start: startOfMonth(minDate), end: startOfMonth(addMonths(maxDate, 1)) };
  }
}

function generateColumns(start: Date, end: Date, scale: TimeScale) {
  const columns: Date[] = [];
  let current = start;
  while (current < end) {
    columns.push(current);
    switch (scale) {
      case 'day': current = addDays(current, 1); break;
      case 'week': current = addWeeks(current, 1); break;
      case 'month': current = addMonths(current, 1); break;
    }
  }
  return columns;
}

function formatColumnHeader(date: Date, scale: TimeScale): string {
  switch (scale) {
    case 'day': return format(date, 'd');
    case 'week': return format(date, 'MMM d');
    case 'month': return format(date, 'MMM yyyy');
  }
}

export function TimelinePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId || '');
  const permissions = useProjectPermissions(projectId);
  const { data: tasks, isLoading: tasksLoading, isError, error, refetch } = useTasks({ projectId: projectId ?? '' });
  const { data: members } = useProjectMembers(projectId ?? '');
  const [scale, setScale] = useState<TimeScale>('week');
  const openTaskPanel = useUIStore((s) => s.openTaskPanel);

  // Only ADMIN, OWNER, or PROJECT_MANAGER can access
  if (!permissions.canAssignDates) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
        <ShieldAlert className="h-12 w-12 text-surface-500" />
        <h2 className="text-lg font-semibold text-surface-200">Access Restricted</h2>
        <p className="text-sm text-surface-500 text-center max-w-md">
          The Timeline view is only available to Project Managers, Admins, and Owners.
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <PageError
        message={(error as Error)?.message || 'Failed to load timeline data'}
        onRetry={refetch}
      />
    );
  }

  if (tasksLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-700 border-t-primary-500" />
      </div>
    );
  }

  const allTasks = tasks ?? [];

  // Group tasks by assignee
  const assigneeMap = new Map<string, { user: User | null; tasks: Task[] }>();

  // "Unassigned" group
  const unassignedTasks = allTasks.filter((t) => !t.assigneeId && (t.startDate || t.dueDate));
  if (unassignedTasks.length > 0) {
    assigneeMap.set('__unassigned__', { user: null, tasks: unassignedTasks });
  }

  // Group by assignee
  allTasks.forEach((task) => {
    if (!task.assigneeId || (!task.startDate && !task.dueDate)) return;
    const existing = assigneeMap.get(task.assigneeId);
    if (existing) {
      existing.tasks.push(task);
    } else {
      assigneeMap.set(task.assigneeId, { user: task.assignee ?? null, tasks: [task] });
    }
  });

  // Also add members with 0 tasks so they appear as rows
  members?.forEach((m) => {
    if (m.user && !assigneeMap.has(m.user.id)) {
      assigneeMap.set(m.user.id, { user: m.user, tasks: [] });
    }
  });

  const assigneeRows = Array.from(assigneeMap.entries());

  return <TimelineChart
    projectName={project?.name || 'Project'}
    assigneeRows={assigneeRows}
    scale={scale}
    onScaleChange={setScale}
    onTaskClick={openTaskPanel}
  />;
}

function TimelineChart({
  projectName,
  assigneeRows,
  scale,
  onScaleChange,
  onTaskClick,
}: {
  projectName: string;
  assigneeRows: [string, { user: User | null; tasks: Task[] }][];
  scale: TimeScale;
  onScaleChange: (s: TimeScale) => void;
  onTaskClick: (taskId: string) => void;
}) {
  const allTasks = assigneeRows.flatMap(([, { tasks }]) => tasks);
  const colWidth = getColumnWidth(scale);
  const dateRange = useMemo(() => getDateRange(allTasks, scale), [allTasks, scale]);
  const columns = useMemo(() => generateColumns(dateRange.start, dateRange.end, scale), [dateRange, scale]);
  const totalWidth = columns.length * colWidth;
  const todayOffset = differenceInDays(startOfDay(new Date()), dateRange.start) * (scale === 'day' ? colWidth : colWidth / 7);

  // Calculate row heights - each assignee row gets enough height for overlapping tasks
  const rowHeights = assigneeRows.map(([, { tasks }]) => Math.max(1, tasks.length) * ROW_HEIGHT);

  function getTaskBar(task: Task) {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const taskStart = task.startDate ? new Date(task.startDate) : dueDate ? addDays(dueDate, -3) : null;
    if (!taskStart) return null;

    const end = dueDate ?? addDays(taskStart, 3);
    const dayWidth = scale === 'day' ? colWidth : scale === 'week' ? colWidth / 7 : colWidth / 30;
    const left = differenceInDays(startOfDay(taskStart), dateRange.start) * dayWidth;
    const duration = Math.max(differenceInDays(startOfDay(end), startOfDay(taskStart)), 1);
    const width = duration * dayWidth;
    return { left, width };
  }

  if (assigneeRows.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-2xl font-bold text-surface-100">{projectName} - Timeline</h1>
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-800">
          <p className="text-surface-400">No team members or tasks to display</p>
          <p className="text-sm text-surface-500">Assign tasks with dates to team members to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">{projectName} - Timeline</h1>
          <p className="text-sm text-surface-500">Team member workload overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const scrollContainer = document.querySelector('[data-timeline-scroll]');
              const todayMarker = scrollContainer?.querySelector('[data-today-marker]') as HTMLElement;
              if (scrollContainer && todayMarker) {
                const offset = parseInt(todayMarker.style.left, 10) || 0;
                scrollContainer.scrollTo({ left: Math.max(0, offset - scrollContainer.clientWidth / 3), behavior: 'smooth' });
              }
            }}
            className="rounded-md border border-surface-700 bg-surface-800 px-3 py-1 text-sm text-surface-300 hover:text-surface-100 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1 rounded-lg bg-surface-800 p-1 border border-surface-700">
            {SCALE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onScaleChange(opt.value)}
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
      </div>

      <div className="flex h-[600px] overflow-hidden rounded-xl border border-surface-700 bg-surface-900">
        {/* Left panel: Assignee names */}
        <div className="w-[200px] shrink-0 overflow-y-auto border-r border-surface-700 bg-surface-800">
          {/* Header */}
          <div
            className="sticky top-0 z-10 flex items-center border-b border-surface-700 bg-surface-900 px-3 text-xs font-medium text-surface-500"
            style={{ height: `${ROW_HEIGHT}px` }}
          >
            Team Member
          </div>
          {/* Rows */}
          {assigneeRows.map(([key, { user }], idx) => (
            <div
              key={key}
              className="flex items-start border-b border-surface-700/50 px-3 py-2"
              style={{ height: `${rowHeights[idx]}px` }}
            >
              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <Avatar src={user.avatarUrl} name={user.name || user.displayName} size="sm" />
                    <span className="text-sm text-surface-200 truncate">
                      {user.name || user.displayName || user.email}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-surface-500 italic">Unassigned</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right panel: Timeline */}
        <div data-timeline-scroll className="flex-1 overflow-auto">
          <div className="relative min-h-full" style={{ width: `${totalWidth}px` }}>
            {/* Column headers */}
            <div
              className="sticky top-0 z-10 flex border-b border-surface-700 bg-surface-900"
              style={{ height: `${ROW_HEIGHT}px` }}
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

            {/* Grid + bars */}
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

              {/* Assignee rows */}
              {assigneeRows.map(([key, { tasks }], rowIdx) => (
                <div
                  key={key}
                  className="relative border-b border-surface-700/30"
                  style={{ height: `${rowHeights[rowIdx]}px` }}
                >
                  {tasks.map((task, taskIdx) => {
                    const bar = getTaskBar(task);
                    if (!bar) return null;
                    const barColor = task.status?.color || PRIORITY_COLORS[task.priority] || '#6366F1';
                    return (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick(task.id)}
                        className="absolute flex items-center rounded-md px-2 text-xs font-medium text-white truncate transition-opacity hover:opacity-90 cursor-pointer"
                        style={{
                          left: `${bar.left}px`,
                          width: `${Math.max(bar.width, 24)}px`,
                          height: `${ROW_HEIGHT - 12}px`,
                          top: `${taskIdx * ROW_HEIGHT + 6}px`,
                          backgroundColor: barColor,
                        }}
                        title={task.title}
                      >
                        <span className="truncate">{task.title}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
