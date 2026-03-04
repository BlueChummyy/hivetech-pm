import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  loading?: boolean;
}

export function StatCard({ icon, label, value, color, loading }: StatCardProps) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p className="text-2xl font-bold text-surface-100">{value}</p>
          )}
          <p className="text-sm text-surface-400">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}
