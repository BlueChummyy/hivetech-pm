import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface RecentActivityProps {
  data: ActivityItem[];
  loading?: boolean;
}

function formatAction(action: string, entityType: string, metadata: Record<string, unknown> | null): string {
  const title = (metadata?.title as string) || entityType;
  const verb = action === 'created' ? 'created' : action === 'updated' ? 'updated' : action === 'deleted' ? 'deleted' : action;
  return `${verb} ${entityType} "${title}"`;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function RecentActivity({ data, loading }: RecentActivityProps) {
  return (
    <Card>
      <CardBody>
        <h3 className="mb-4 text-sm font-semibold text-surface-200">Recent Activity</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-surface-500">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <Avatar
                  src={item.user.avatarUrl}
                  name={item.user.name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-surface-300">
                    <span className="font-medium text-surface-200">{item.user.name}</span>
                    {' '}
                    {formatAction(item.action, item.entityType, item.metadata)}
                  </p>
                  <p className="text-xs text-surface-500">{formatTimeAgo(item.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
