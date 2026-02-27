import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { FilterBar, type TaskFilterState } from '@/components/list/FilterBar';
import { PageError } from '@/components/ui/PageError';
import { useTasks } from '@/hooks/useTasks';
import { useStatuses } from '@/hooks/useStatuses';
import { useProjectMembers } from '@/hooks/useMembers';
import { useLabels } from '@/hooks/useLabels';
import type { Task } from '@/types/models.types';

function BoardSkeleton() {
  return (
    <div className="flex h-full gap-4 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex w-72 shrink-0 flex-col rounded-lg bg-[#14141A]"
        >
          <div className="flex items-center gap-2 px-3 py-3">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white/[0.08]" />
            <div className="h-4 w-20 animate-pulse rounded bg-white/[0.08]" />
          </div>
          <div className="space-y-2 px-2">
            {Array.from({ length: 3 - i }).map((_, j) => (
              <div
                key={j}
                className="h-24 animate-pulse rounded-lg bg-white/[0.04]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BoardPage() {
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

  const [filters, setFilters] = useState<TaskFilterState>({
    search: '',
    statusIds: [],
    priorities: [],
    assigneeIds: [],
    labelIds: [],
    groupBy: { field: 'status', direction: 'asc', enabled: false },
  });

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
        (t) => {
          if (t.assignees && t.assignees.length > 0) {
            return t.assignees.some((a) => filters.assigneeIds.includes(a.userId));
          }
          return t.assigneeId && filters.assigneeIds.includes(t.assigneeId);
        },
      );
    }

    if (filters.labelIds.length > 0) {
      result = result.filter((t) =>
        t.labels?.some((tl) => filters.labelIds.includes(tl.labelId)),
      );
    }

    return result;
  }, [tasks, filters]);

  if (tasksLoading || statusesLoading) {
    return <BoardSkeleton />;
  }

  if (tasksError || statusesError) {
    return (
      <PageError
        message={
          (tasksErr as Error)?.message ||
          (statusesErr as Error)?.message ||
          'Failed to load board data'
        }
        onRetry={() => {
          refetchTasks();
          refetchStatuses();
        }}
      />
    );
  }

  if (!statuses || statuses.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No statuses configured for this project.</p>
          <p className="mt-1 text-sm text-gray-500">
            Go to Settings to add workflow statuses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-2 sm:p-4">
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        statuses={statuses}
        members={members}
        labels={labels}
      />
      <div className="flex-1 min-h-0">
        <KanbanBoard
          tasks={filteredTasks}
          statuses={statuses}
          projectId={projectId ?? ''}
        />
      </div>
    </div>
  );
}
