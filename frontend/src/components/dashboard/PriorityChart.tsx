import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface PriorityChartProps {
  data: { priority: string; count: number }[];
  loading?: boolean;
}

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  NONE: 'None',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-blue-500',
  NONE: 'bg-surface-500',
};

export function PriorityChart({ data, loading }: PriorityChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardBody>
        <h3 className="mb-4 text-sm font-semibold text-surface-200">Priority Breakdown</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((d) => (
              <div key={d.priority}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-surface-300">
                    {PRIORITY_LABELS[d.priority] || d.priority}
                  </span>
                  <span className="text-sm font-medium text-surface-200">{d.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-700">
                  <div
                    className={`h-full rounded-full transition-all ${PRIORITY_COLORS[d.priority] || 'bg-surface-500'}`}
                    style={{ width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%` }}
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
