import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';

interface AssigneeChartProps {
  data: {
    userId: string | null;
    name: string;
    avatarUrl: string | null;
    count: number;
  }[];
  loading?: boolean;
}

export function AssigneeChart({ data, loading }: AssigneeChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardBody>
        <h3 className="mb-4 text-sm font-semibold text-surface-200">Assignee Workload</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-surface-500">No assigned tasks</p>
        ) : (
          <div className="space-y-3">
            {data.slice(0, 8).map((d) => (
              <div key={d.userId || 'unassigned'}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={d.avatarUrl}
                      name={d.name}
                      size="sm"
                    />
                    <span className="text-sm text-surface-300 truncate max-w-[140px]">
                      {d.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-surface-200">{d.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-700">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${(d.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
