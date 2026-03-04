import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import { useUIStore } from '@/store/ui.store';
import { NotificationType } from '@/types/models.types';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageError } from '@/components/ui/PageError';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

function getNotificationLabel(type: NotificationType): string {
  switch (type) {
    case NotificationType.TASK_ASSIGNED:
      return 'Task Assigned';
    case NotificationType.TASK_UPDATED:
      return 'Task Updated';
    case NotificationType.COMMENT_ADDED:
      return 'Comment';
    case NotificationType.MENTIONED:
      return 'Mention';
    case NotificationType.STATUS_CHANGED:
      return 'Status Changed';
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

function NotificationsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="space-y-1 rounded-xl border border-surface-700 bg-surface-800 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const { data: notifications, isLoading, isError, error, refetch } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered =
    filter === 'unread'
      ? notifications?.filter((n) => !n.isRead)
      : notifications;

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  if (isLoading) {
    return <NotificationsSkeleton />;
  }

  if (isError) {
    return (
      <PageError
        message={(error as Error)?.message || 'Failed to load notifications'}
        onRetry={refetch}
      />
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
                !notification.isRead && 'bg-primary-600/5',
              )}
              onClick={() => {
                if (!notification.isRead) {
                  markAsRead.mutate(notification.id);
                }
                if (notification.resourceType === 'TASK' && notification.resourceId) {
                  useUIStore.getState().openTaskPanel(notification.resourceId);
                }
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-surface-500">
                    {getNotificationLabel(notification.type)}
                  </span>
                  {!notification.isRead && (
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
