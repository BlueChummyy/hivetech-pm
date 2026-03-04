import { Link } from 'react-router-dom';
import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface ProjectProgressProps {
  data: {
    projectId: string;
    name: string;
    key: string;
    total: number;
    done: number;
    percentage: number;
  }[];
  loading?: boolean;
}

export function ProjectProgress({ data, loading }: ProjectProgressProps) {
  return (
    <Card>
      <CardBody>
        <h3 className="mb-4 text-sm font-semibold text-surface-200">Project Progress</h3>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="mb-2 h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-surface-500">No projects with tasks</p>
        ) : (
          <div className="space-y-4">
            {data.map((p) => (
              <div key={p.projectId}>
                <div className="mb-1 flex items-center justify-between">
                  <Link
                    to={`/projects/${p.projectId}/board`}
                    className="flex items-center gap-2 text-sm text-surface-200 hover:text-primary-400 transition-colors"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-primary-600/15 text-[10px] font-bold text-primary-400">
                      {p.key}
                    </span>
                    <span className="truncate max-w-[180px]">{p.name}</span>
                  </Link>
                  <span className="text-xs text-surface-400">
                    {p.done}/{p.total} ({p.percentage}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${p.percentage}%` }}
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
