import { useState, useMemo, type KeyboardEvent } from 'react';
import { useParams } from 'react-router-dom';
import { ListFilter, Plus } from 'lucide-react';
import { TaskTable } from '@/components/list/TaskTable';
import { FilterBar, type TaskFilterState } from '@/components/list/FilterBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageError } from '@/components/ui/PageError';
import { useTasks, useCreateTask } from '@/hooks/useTasks';
import { useStatuses } from '@/hooks/useStatuses';
import { useProjectMembers } from '@/hooks/useMembers';
import { useLabels } from '@/hooks/useLabels';
import { useProjectPermissions } from '@/hooks/useProjectRole';
import { useToast } from '@/components/ui/Toast';
import type { Task } from '@/types/models.types';

function ListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <div className="h-10 w-full animate-pulse rounded-lg bg-white/[0.04]" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 w-full animate-pulse rounded bg-white/[0.03]" />
      ))}
    </div>
  );
}

export function ListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErr,
    refetch: refetchTasks,
  } = useTasks({
    projectId: projectId ?? '',
  });
  const {
    data: statuses,
    isLoading: statusesLoading,
    isError: statusesError,
    error: statusesErr,
    refetch: refetchStatuses,
  } = useStatuses(projectId ?? '');

  const { data: members } = useProjectMembers(projectId ?? '');
  const { data: labels } = useLabels(projectId ?? '');
  const createTask = useCreateTask();
  const permissions = useProjectPermissions(projectId);
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const [filters, setFilters] = useState<TaskFilterState>({
    search: '',
    statusIds: [],
    priorities: [],
    assigneeIds: [],
    labelIds: [],
    groupBy: { field: 'status', direction: 'asc', enabled: false },
  });

  const hasActiveFilters =
    filters.search !== '' ||
    filters.statusIds.length > 0 ||
    filters.priorities.length > 0 ||
    filters.assigneeIds.length > 0 ||
    filters.labelIds.length > 0;

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let result: Task[] = tasks;

    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          String(t.taskNumber).includes(query),
      );
    }

    if (filters.statusIds.length > 0) {
      result = result.filter((t) => filters.statusIds.includes(t.statusId));
    }

    if (filters.priorities.length > 0) {
      result = result.filter((t) => filters.priorities.includes(t.priority));
    }

    if (filters.assigneeIds.length > 0) {
      result = result.filter(
        (t) => t.assigneeId && filters.assigneeIds.includes(t.assigneeId),
      );
    }

    if (filters.labelIds.length > 0) {
      result = result.filter((t) =>
        t.labels?.some((tl) => filters.labelIds.includes(tl.labelId)),
      );
    }

    return result;
  }, [tasks, filters]);

  const sortedStatuses = useMemo(
    () => (statuses ?? []).slice().sort((a, b) => a.position - b.position),
    [statuses],
  );

  const handleAddTask = async () => {
    const title = newTitle.trim();
    if (!title) {
      setIsAdding(false);
      return;
    }
    const defaultStatus = sortedStatuses[0];
    if (!defaultStatus || !projectId) return;
    try {
      await createTask.mutateAsync({
        projectId,
        statusId: defaultStatus.id,
        title,
      });
      setNewTitle('');
      setIsAdding(false);
    } catch (err) {
      toast({
        type: 'error',
        title: 'Failed to create task',
        description: (err as Error).message || 'Please try again.',
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAddTask();
    else if (e.key === 'Escape') {
      setNewTitle('');
      setIsAdding(false);
    }
  };

  if (tasksLoading || statusesLoading) {
    return <ListSkeleton />;
  }

  if (tasksError || statusesError) {
    return (
      <PageError
        message={
          (tasksErr as Error)?.message ||
          (statusesErr as Error)?.message ||
          'Failed to load tasks'
        }
        onRetry={() => {
          refetchTasks();
          refetchStatuses();
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 sm:gap-4 p-2 sm:p-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            statuses={statuses ?? []}
            members={members}
            labels={labels}
          />
        </div>
        {permissions.canCreateTasks && (
          isAdding ? (
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={handleAddTask}
              onKeyDown={handleKeyDown}
              placeholder="Task title..."
              className="w-48 sm:w-56 rounded-md border border-white/[0.08] bg-[#1E1E26] px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 shrink-0"
            />
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-500 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Task
            </button>
          )
        )}
      </div>
      {filteredTasks.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={<ListFilter className="h-10 w-10" />}
            title="No tasks match your filters"
            description="Try adjusting your filters or clear them to see all tasks."
            action={{
              label: 'Clear filters',
              onClick: () =>
                setFilters({
                  search: '',
                  statusIds: [],
                  priorities: [],
                  assigneeIds: [],
                  labelIds: [],
                  groupBy: filters.groupBy,
                }),
            }}
          />
        ) : (
          <EmptyState
            icon={<ListFilter className="h-10 w-10" />}
            title="No tasks yet"
            description="Click the + Task button above to create your first task."
          />
        )
      ) : (
        <TaskTable
          tasks={filteredTasks}
          statuses={statuses ?? []}
          groupBy={filters.groupBy}
        />
      )}
    </div>
  );
}
