import { Link } from 'react-router-dom';
import {
  CheckSquare,
  AlertTriangle,
  CalendarClock,
  FolderKanban,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';

function StatCard({
  icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  loading?: boolean;
}) {
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

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const { data: projects, isLoading: projectsLoading } = useProjects(activeWorkspaceId || '');
  const { data: myTasks, isLoading: tasksLoading } = useTasks(
    user?.id ? { assigneeId: user.id } : {},
  );

  const overdueTasks = myTasks?.filter((t) => {
    if (!t.dueDate || t.completedAt) return false;
    return new Date(t.dueDate) < new Date();
  }) ?? [];

  const upcomingTasks = myTasks?.filter((t) => {
    if (!t.dueDate || t.completedAt) return false;
    const due = new Date(t.dueDate);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return due >= now && due <= weekFromNow;
  }) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-100">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-surface-400">
          Here&apos;s an overview of your work.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<CheckSquare className="h-5 w-5 text-primary-400" />}
          label="My Tasks"
          value={myTasks?.length ?? 0}
          color="bg-primary-600/15"
          loading={tasksLoading}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
          label="Overdue"
          value={overdueTasks.length}
          color="bg-red-500/15"
          loading={tasksLoading}
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5 text-amber-400" />}
          label="Due This Week"
          value={upcomingTasks.length}
          color="bg-amber-500/15"
          loading={tasksLoading}
        />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-surface-200">Recent Projects</h2>
          {activeWorkspaceId && (
            <Link
              to={`/workspaces/${activeWorkspaceId}/projects`}
              className="flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {projectsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardBody>
                  <Skeleton className="mb-3 h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </CardBody>
              </Card>
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-10 w-10" />}
            title="No projects yet"
            description="Create a workspace and your first project to get started."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((project) => (
              <Link key={project.id} to={`/projects/${project.id}/board`}>
                <Card className="transition-colors hover:border-surface-600">
                  <CardBody>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600/15 text-sm font-bold text-primary-400">
                        {project.key}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-surface-100">
                          {project.name}
                        </p>
                        {project.description && (
                          <p className="truncate text-xs text-surface-500">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" disabled>
          <Plus className="h-4 w-4" />
          Quick Create Task
        </Button>
      </div>
    </div>
  );
}
