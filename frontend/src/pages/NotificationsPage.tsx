import { useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import { NotificationType } from '@/types/models.types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

function getNotificationLabel(type: NotificationType): string {
  switch (type) {
    case NotificationType.TASK_ASSIGNED:
      return 'Task Assigned';
    case NotificationType.TASK_UPDATED:
      return 'Task Updated';
    case NotificationType.TASK_COMMENTED:
      return 'Comment';
    case NotificationType.MENTION:
      return 'Mention';
    case NotificationType.PROJECT_INVITE:
      return 'Project Invite';
    case NotificationType.WORKSPACE_INVITE:
      return 'Workspace Invite';
    default:
      return 'Notification';
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered =
    filter === 'unread'
      ? notifications?.filter((n) => !n.read)
      : notifications;

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-surface-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-100">Notifications</h1>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => markAllAsRead.mutate()}
            loading={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex gap-1">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            filter === 'all'
              ? 'bg-surface-700 text-surface-100'
              : 'text-surface-400 hover:text-surface-200',
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            filter === 'unread'
              ? 'bg-surface-700 text-surface-100'
              : 'text-surface-400 hover:text-surface-200',
          )}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {!filtered || filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
          description="You're all caught up."
        />
      ) : (
        <div className="space-y-1 rounded-xl border border-surface-700 bg-surface-800 overflow-hidden">
          {filtered.map((notification) => (
            <button
              key={notification.id}
              className={cn(
                'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-700/50',
                !notification.read && 'bg-primary-600/5',
              )}
              onClick={() => {
                if (!notification.read) {
                  markAsRead.mutate(notification.id);
                }
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-surface-500">
                    {getNotificationLabel(notification.type)}
                  </span>
                  {!notification.read && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                  )}
                </div>
                <p className="mt-0.5 text-sm text-surface-200">
                  {notification.title}
                </p>
                {notification.message && (
                  <p className="mt-0.5 text-xs text-surface-400 line-clamp-2">
                    {notification.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-surface-500">
                  {timeAgo(notification.createdAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
