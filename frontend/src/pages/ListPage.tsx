import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ListFilter } from 'lucide-react';
import { TaskTable } from '@/components/list/TaskTable';
import { FilterBar, type TaskFilterState } from '@/components/list/FilterBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageError } from '@/components/ui/PageError';
import { useTasks } from '@/hooks/useTasks';
import { useStatuses } from '@/hooks/useStatuses';
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

  const [filters, setFilters] = useState<TaskFilterState>({
    search: '',
    statusIds: [],
    priorities: [],
    assigneeIds: [],
  });

  const hasActiveFilters =
    filters.search !== '' ||
    filters.statusIds.length > 0 ||
    filters.priorities.length > 0 ||
    filters.assigneeIds.length > 0;

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let result: Task[] = tasks;

    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.identifier.toLowerCase().includes(query),
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

    return result;
  }, [tasks, filters]);

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
    <div className="flex h-full flex-col gap-4 p-4">
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        statuses={statuses ?? []}
      />
      {filteredTasks.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={<ListFilter className="h-10 w-10" />}
            title="No tasks match your filters"
            description="Try adjusting your filters or clear them to see all tasks."
            action={{
              label: 'Clear filters',
              onClick: () =>
                setFilters({ search: '', statusIds: [], priorities: [], assigneeIds: [] }),
            }}
          />
        ) : (
          <EmptyState
            icon={<ListFilter className="h-10 w-10" />}
            title="No tasks yet"
            description="Create tasks from the Board view to see them here."
          />
        )
      ) : (
        <TaskTable tasks={filteredTasks} statuses={statuses ?? []} />
      )}
    </div>
  );
}
