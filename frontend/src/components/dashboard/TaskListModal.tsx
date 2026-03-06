import { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useDashboardFilteredTasks } from '@/hooks/useDashboard';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import type { DashboardFilter } from '@/api/dashboard';
import type { Priority, StatusCategory } from '@/types/models.types';

interface TaskListModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  filter: DashboardFilter;
  title: string;
}

const filterLabels: Record<DashboardFilter, string> = {
  active: 'Active Tasks',
  completed: 'Completed Tasks',
  in_progress: 'In Progress Tasks',
  overdue: 'Overdue Tasks',
  due_this_week: 'Due This Week',
  unassigned: 'Unassigned Tasks',
};

export function TaskListModal({ open, onClose, workspaceId, filter, title }: TaskListModalProps) {
  const { data: tasks, isLoading } = useDashboardFilteredTasks(
    workspaceId,
    open ? filter : null,
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleTaskClick = (taskId: string) => {
    useUIStore.getState().openTaskPanel(taskId);
    onClose();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onMouseDown={onClose}>
      <div
        className="relative w-full max-w-4xl max-h-[80vh] mx-4 flex flex-col rounded-xl border border-surface-700 bg-surface-900 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">{title || filterLabels[filter]}</h2>
            {tasks && (
              <p className="text-sm text-surface-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
              <span className="ml-2 text-sm text-surface-400">Loading tasks...</span>
            </div>
          ) : !tasks || tasks.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-surface-500">No tasks found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-surface-900 border-b border-surface-700">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-surface-500">
                  <th className="px-6 py-3">Task</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="cursor-pointer transition-colors hover:bg-surface-800/60"
                    onClick={() => handleTaskClick(task.id)}
                  >
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-surface-200 truncate max-w-[280px]">
                          {task.title}
                        </span>
                        <span className="text-xs text-surface-500">
                          {task.projectKey}-{task.taskNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-surface-400 truncate max-w-[120px] block">
                        {task.projectName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge category={task.statusCategory as StatusCategory}>
                        {task.statusName}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority as Priority} />
                    </td>
                    <td className="px-4 py-3">
                      {task.assignees.length === 0 ? (
                        <span className="text-xs text-surface-500">Unassigned</span>
                      ) : (
                        <div className="flex items-center -space-x-1">
                          {task.assignees.slice(0, 3).map((a) => (
                            <Avatar
                              key={a.userId}
                              src={a.avatarUrl}
                              name={a.name}
                              size="sm"
                            />
                          ))}
                          {task.assignees.length > 3 && (
                            <span className="ml-2 text-xs text-surface-400">
                              +{task.assignees.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${
                        task.dueDate && new Date(task.dueDate) < new Date() && task.statusCategory !== 'DONE' && task.statusCategory !== 'CANCELLED'
                          ? 'text-red-400'
                          : 'text-surface-400'
                      }`}>
                        {formatDate(task.dueDate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
