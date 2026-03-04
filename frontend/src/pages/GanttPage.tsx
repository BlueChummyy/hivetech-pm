import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { useStatuses } from '@/hooks/useStatuses';
import { useProjectMembers } from '@/hooks/useMembers';
import { useLabels } from '@/hooks/useLabels';
import { PageError } from '@/components/ui/PageError';
import { GanttChart } from '@/components/gantt/GanttChart';
import { FilterBar, type TaskFilterState } from '@/components/list/FilterBar';
import type { Task } from '@/types/models.types';

export function GanttPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    data: tasks,
    isLoading,
    isError,
    error,
    refetch,
  } = useTasks({ projectId: projectId ?? '' });
  const { data: statuses } = useStatuses(projectId ?? '');
  const { data: members } = useProjectMembers(projectId ?? '');
  const { data: labels } = useLabels(projectId ?? '');

  const [filters, setFilters] = useState<TaskFilterState>({
    search: '',
    statusIds: [],
    priorities: [],
    assigneeIds: [],
    labelIds: [],
    showClosed: false,
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

    // Apply groupBy sorting when enabled
    if (filters.groupBy.enabled && filters.groupBy.field !== 'none') {
      const dir = filters.groupBy.direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        switch (filters.groupBy.field) {
          case 'status': {
            const posA = a.status?.position ?? 0;
            const posB = b.status?.position ?? 0;
            return dir * (posA - posB);
          }
          case 'priority': {
            const order: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };
            return dir * ((order[a.priority] ?? 4) - (order[b.priority] ?? 4));
          }
          case 'assignee': {
            const nameA = a.assignees?.[0]?.user?.name || a.assignee?.name || 'zzz';
            const nameB = b.assignees?.[0]?.user?.name || b.assignee?.name || 'zzz';
            return dir * nameA.localeCompare(nameB);
          }
          case 'dueDate': {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return dir * (dateA - dateB);
          }
          default:
            return 0;
        }
      });
    }

    return result;
  }, [tasks, filters]);

  if (isError) {
    return (
      <PageError
        message={(error as Error)?.message || 'Failed to load timeline data'}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 sm:gap-4 p-2 sm:p-4">
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        statuses={statuses ?? []}
        members={members}
        labels={labels}
      />
      <GanttChart tasks={filteredTasks} isLoading={isLoading} projectId={projectId} />
    </div>
  );
}
