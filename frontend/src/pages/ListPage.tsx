import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ListFilter, Plus } from 'lucide-react';
import { TaskTable } from '@/components/list/TaskTable';
import { FilterBar, type TaskFilterState } from '@/components/list/FilterBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageError } from '@/components/ui/PageError';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { BulkActionBar } from '@/components/BulkActionBar';
import { useTasks, useUpdateTask, useCloneTask, useDeleteTask } from '@/hooks/useTasks';
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

  const [filters, setFilters] = useState<TaskFilterState>({
    search: '',
    statusIds: [],
    priorities: [],
    assigneeIds: [],
    labelIds: [],
    showClosed: false,
    groupBy: { field: 'status', direction: 'asc', enabled: false },
  });

  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErr,
    refetch: refetchTasks,
  } = useTasks({
    projectId: projectId ?? '',
    includeClosed: filters.showClosed,
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
  const permissions = useProjectPermissions(projectId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const updateTask = useUpdateTask();
  const cloneTask = useCloneTask();
  const deleteTask = useDeleteTask();
  const { toast } = useToast();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Listen for keyboard shortcut custom events
  useEffect(() => {
    const handleClone = (e: Event) => {
      const taskId = (e as CustomEvent).detail?.taskId;
      if (taskId) {
        cloneTask.mutate(taskId, {
          onSuccess: () => toast({ type: 'success', title: 'Task duplicated' }),
          onError: () => toast({ type: 'error', title: 'Failed to duplicate task' }),
        });
      }
    };

    const handleSetPriority = (e: Event) => {
      const { taskId, priority } = (e as CustomEvent).detail ?? {};
      if (taskId && priority) {
        updateTask.mutate(
          { id: taskId, data: { priority } },
          {
            onSuccess: () => toast({ type: 'success', title: `Priority set to ${priority.charAt(0) + priority.slice(1).toLowerCase()}` }),
            onError: () => toast({ type: 'error', title: 'Failed to update priority' }),
          },
        );
      }
    };

    const handleDelete = (e: Event) => {
      const taskId = (e as CustomEvent).detail?.taskId;
      if (taskId) {
        if (deleteConfirmId === taskId) {
          deleteTask.mutate(taskId, {
            onSuccess: () => {
              toast({ type: 'success', title: 'Task deleted' });
              setDeleteConfirmId(null);
            },
            onError: () => toast({ type: 'error', title: 'Failed to delete task' }),
          });
        } else {
          setDeleteConfirmId(taskId);
          toast({ type: 'info', title: 'Press Delete again to confirm' });
          // Auto-clear after 3 seconds
          setTimeout(() => setDeleteConfirmId(null), 3000);
        }
      }
    };

    window.addEventListener('shortcut:clone-task', handleClone);
    window.addEventListener('shortcut:set-priority', handleSetPriority);
    window.addEventListener('shortcut:delete-task', handleDelete);
    return () => {
      window.removeEventListener('shortcut:clone-task', handleClone);
      window.removeEventListener('shortcut:set-priority', handleSetPriority);
      window.removeEventListener('shortcut:delete-task', handleDelete);
    };
  }, [cloneTask, updateTask, deleteTask, toast, deleteConfirmId]);

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

  const sortedStatuses = useMemo(
    () => (statuses ?? []).slice().sort((a, b) => a.position - b.position),
    [statuses],
  );

  const defaultStatus = sortedStatuses[0];

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
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-500 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Task
          </button>
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
                  showClosed: false,
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

      <BulkActionBar />

      {showCreateModal && projectId && defaultStatus && (
        <CreateTaskModal
          projectId={projectId}
          statusId={defaultStatus.id}
          statusName={defaultStatus.name}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
