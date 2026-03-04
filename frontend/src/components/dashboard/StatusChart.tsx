import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface StatusChartProps {
  data: { category: string; count: number }[];
  loading?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  ACTIVE: 'In Progress',
  DONE: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-surface-500',
  ACTIVE: 'bg-blue-500',
  DONE: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
};

export function StatusChart({ data, loading }: StatusChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardBody>
        <h3 className="mb-4 text-sm font-semibold text-surface-200">Task Status Distribution</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : total === 0 ? (
          <p className="text-sm text-surface-500">No tasks yet</p>
        ) : (
          <>
            {/* Stacked bar */}
            <div className="mb-4 flex h-4 overflow-hidden rounded-full bg-surface-700">
              {data
                .filter((d) => d.count > 0)
                .map((d) => (
                  <div
                    key={d.category}
                    className={`${STATUS_COLORS[d.category] || 'bg-surface-500'} transition-all`}
                    style={{ width: `${(d.count / total) * 100}%` }}
                    title={`${STATUS_LABELS[d.category] || d.category}: ${d.count}`}
                  />
                ))}
            </div>
            {/* Legend */}
            <div className="space-y-2">
              {data.map((d) => (
                <div key={d.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[d.category] || 'bg-surface-500'}`} />
                    <span className="text-sm text-surface-300">
                      {STATUS_LABELS[d.category] || d.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-200">{d.count}</span>
                    <span className="text-xs text-surface-500">
                      ({total > 0 ? Math.round((d.count / total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
