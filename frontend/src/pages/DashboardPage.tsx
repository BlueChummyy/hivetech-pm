import { Card, CardHeader, CardBody } from '@/components/ui/Card';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-surface-400">
          Welcome to HiveTech. Here&apos;s an overview of your work.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-surface-200">
              Recent Projects
            </h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-surface-400">
              No projects yet. Create a workspace to get started.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-surface-200">
              Assigned Tasks
            </h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-surface-400">
              No tasks assigned to you yet.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-surface-200">
              Activity Feed
            </h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-surface-400">
              No recent activity.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
