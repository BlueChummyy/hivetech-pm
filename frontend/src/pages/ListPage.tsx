import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { TaskTable } from '@/components/list/TaskTable';
import { FilterBar, type TaskFilterState } from '@/components/list/FilterBar';
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
  const { data: tasks, isLoading: tasksLoading } = useTasks({
    projectId: projectId ?? '',
  });
  const { data: statuses, isLoading: statusesLoading } = useStatuses(
    projectId ?? '',
  );

  const [filters, setFilters] = useState<TaskFilterState>({
    search: '',
    statusIds: [],
    priorities: [],
    assigneeIds: [],
  });

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

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        statuses={statuses ?? []}
      />
      <TaskTable tasks={filteredTasks} statuses={statuses ?? []} />
    </div>
  );
}
