import { formatDistanceToNow } from 'date-fns';
import { Activity, Loader2 } from 'lucide-react';
import { useTaskActivity } from '@/hooks/useActivity';
import { Avatar } from '@/components/ui/Avatar';
import type { ActivityLog } from '@/types/models.types';

interface ActivitySectionProps {
  taskId: string;
}

function getUserName(log: ActivityLog): string {
  if (!log.user) return 'Unknown';
  const { firstName, lastName } = log.user as any;
  if (firstName && lastName) return `${firstName} ${lastName}`;
  return (log.user as any).name || (log.user as any).displayName || log.user.email || 'Unknown';
}

function describeAction(log: ActivityLog): string {
  const meta = log.metadata as Record<string, any> | null;

  switch (log.action) {
    case 'created':
      return 'created this task';
    case 'updated': {
      if (!meta?.changes) return 'updated this task';
      const parts: string[] = [];
      const changes = meta.changes as Record<string, { from: any; to: any }>;
      for (const [field, change] of Object.entries(changes)) {
        const label = fieldLabel(field);
        if (change.from && change.to) {
          parts.push(`changed ${label} from "${formatValue(field, change.from)}" to "${formatValue(field, change.to)}"`);
        } else if (change.to) {
          parts.push(`set ${label} to "${formatValue(field, change.to)}"`);
        } else {
          parts.push(`cleared ${label}`);
        }
      }
      return parts.join(', ') || 'updated this task';
    }
    case 'status_changed': {
      if (meta?.from && meta?.to) {
        return `changed status from "${meta.from}" to "${meta.to}"`;
      }
      return 'changed the status';
    }
    case 'assigned': {
      const name = meta?.assigneeName || 'someone';
      return `assigned ${name}`;
    }
    case 'unassigned': {
      const name = meta?.assigneeName || 'someone';
      return `unassigned ${name}`;
    }
    case 'commented':
      return 'added a comment';
    case 'comment_deleted':
      return 'deleted a comment';
    case 'deleted':
      return 'deleted this task';
    case 'restored':
      return 'restored this task';
    case 'cloned':
      return 'cloned this task';
    case 'closed':
      return 'closed this task';
    case 'reopened':
      return 'reopened this task';
    default:
      return log.action.replace(/_/g, ' ');
  }
}

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    title: 'title',
    description: 'description',
    statusId: 'status',
    status: 'status',
    priority: 'priority',
    assigneeId: 'assignee',
    assigneeIds: 'assignees',
    startDate: 'start date',
    dueDate: 'due date',
    estimatedHours: 'estimated hours',
    parentId: 'parent task',
  };
  return labels[field] || field;
}

function formatValue(field: string, value: any): string {
  if (value === null || value === undefined) return 'none';
  if (field === 'priority') return String(value).toLowerCase();
  if (field.includes('Date') && typeof value === 'string') {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function ActivitySection({ taskId }: ActivitySectionProps) {
  const { data: logs, isLoading } = useTaskActivity(taskId);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-surface-300 flex items-center gap-1.5">
        <Activity className="h-3.5 w-3.5" />
        Activity
      </h4>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-surface-500" />
          <span className="text-sm text-surface-500">Loading activity...</span>
        </div>
      ) : logs && logs.length > 0 ? (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {logs.map((log: ActivityLog) => (
            <div key={log.id} className="flex gap-3">
              <Avatar
                src={log.user?.avatarUrl}
                name={getUserName(log)}
                size="sm"
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-300">
                  <span className="font-medium text-surface-200">
                    {getUserName(log)}
                  </span>{' '}
                  {describeAction(log)}
                </p>
                <span className="text-xs text-surface-500">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-surface-500">No activity yet</p>
      )}
    </div>
  );
}
