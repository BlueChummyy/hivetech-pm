import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Search,
  Calendar,
  FolderKanban,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useMyTasks } from '@/hooks/useMyTasks';
import { useUIStore } from '@/store/ui.store';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageError } from '@/components/ui/PageError';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import type { Task, Priority, StatusCategory } from '@/types/models.types';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: '', label: 'All priorities' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'NONE', label: 'None' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days}d`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function MyTasksPage() {
  const { data: tasks, isLoading, isError, error, refetch } = useMyTasks();
  const openTaskPanel = useUIStore((s) => s.openTaskPanel);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((task) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !task.title.toLowerCase().includes(q) &&
          !task.project?.name?.toLowerCase().includes(q) &&
          !String(task.taskNumber).includes(q)
        ) {
          return false;
        }
      }
      if (statusFilter && task.status?.category !== statusFilter) return false;
      if (priorityFilter && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  // Group by project
  const grouped = useMemo(() => {
    const map = new Map<string, { projectName: string; projectId: string; projectKey: string; tasks: Task[] }>();
    for (const task of filteredTasks) {
      const pid = task.project?.id ?? 'unknown';
      if (!map.has(pid)) {
        map.set(pid, {
          projectName: task.project?.name ?? 'Unknown Project',
          projectId: pid,
          projectKey: task.project?.key ?? '??',
          tasks: [],
        });
      }
      map.get(pid)!.tasks.push(task);
    }
    return Array.from(map.values());
  }, [filteredTasks]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">My Tasks</h1>
        <p className="mt-1 text-sm text-gray-400">
          All tasks assigned to you across all projects
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-lg border border-surface-700 bg-surface-800 py-2 pl-9 pr-3 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:ring-offset-surface-900"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {PRIORITY_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {(search || statusFilter || priorityFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); }}
            className="text-xs text-surface-400 hover:text-surface-200 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <TaskListSkeleton />
      ) : isError ? (
        <PageError
          message={(error as Error)?.message || 'Failed to load tasks'}
          onRetry={refetch}
        />
      ) : filteredTasks.length === 0 ? (
        tasks && tasks.length > 0 ? (
          <EmptyState
            icon={<Search className="h-10 w-10" />}
            title="No matching tasks"
            description="Try adjusting your search or filters."
          />
        ) : (
          <EmptyState
            icon={<CheckSquare className="h-10 w-10" />}
            title="No tasks assigned to you"
            description="When someone assigns a task to you, it will appear here."
          />
        )
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.projectId}>
              {/* Project header */}
              <div className="mb-2 flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-surface-500" />
                <Link
                  to={`/projects/${group.projectId}/board`}
                  className="text-sm font-semibold text-surface-200 hover:text-primary-400 transition-colors"
                >
                  {group.projectName}
                </Link>
                <span className="rounded bg-surface-700/60 px-1.5 py-0.5 text-[10px] text-surface-500">
                  {group.projectKey}
                </span>
                <span className="text-xs text-surface-500">
                  {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>

              {/* Task rows */}
              <div className="rounded-lg border border-surface-700/60 bg-surface-800/40 overflow-hidden">
                {group.tasks.map((task, i) => (
                  <button
                    key={task.id}
                    onClick={() => openTaskPanel(task.id)}
                    className={cn(
                      'flex w-full items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 text-left transition-colors hover:bg-surface-700/40 touch-manipulation min-h-[44px]',
                      i !== 0 && 'border-t border-surface-700/40',
                    )}
                  >
                    {/* Task number */}
                    <span className="hidden sm:inline shrink-0 text-xs font-mono text-surface-500">
                      {task.project?.key}-{task.taskNumber}
                    </span>

                    {/* Title */}
                    <span className="min-w-0 flex-1 truncate text-sm text-surface-200">
                      {task.title}
                    </span>

                    {/* Status badge */}
                    {task.status && (
                      <span className="hidden sm:inline">
                        <StatusBadge category={task.status.category as StatusCategory}>
                          {task.status.name}
                        </StatusBadge>
                      </span>
                    )}

                    {/* Priority badge */}
                    <PriorityBadge priority={task.priority as Priority} />

                    {/* Due date */}
                    {task.dueDate && (
                      <span className={cn(
                        'hidden sm:flex shrink-0 items-center gap-1 text-xs',
                        isOverdue(task.dueDate) && task.status?.category !== 'DONE'
                          ? 'text-red-400'
                          : 'text-surface-500',
                      )}>
                        <Calendar className="h-3 w-3" />
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskListSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((g) => (
        <div key={g}>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-surface-700" />
            <div className="h-4 w-32 animate-pulse rounded bg-surface-700" />
          </div>
          <div className="rounded-lg border border-surface-700/60 bg-surface-800/40 overflow-hidden">
            {[1, 2, 3].map((r) => (
              <div
                key={r}
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  r !== 1 && 'border-t border-surface-700/40',
                )}
              >
                <div className="h-3 w-12 animate-pulse rounded bg-surface-700" />
                <div className="h-4 flex-1 animate-pulse rounded bg-surface-700" />
                <div className="h-5 w-16 animate-pulse rounded bg-surface-700" />
                <div className="h-5 w-14 animate-pulse rounded bg-surface-700" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
