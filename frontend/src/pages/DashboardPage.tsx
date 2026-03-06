import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  AlertTriangle,
  CalendarClock,
  FolderKanban,
  Plus,
  ArrowRight,
  Building2,
  ListChecks,
  Activity,
  UserX,
  Pencil,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageError } from '@/components/ui/PageError';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useProjects';
import { useDashboardStats } from '@/hooks/useDashboard';
import { CreateWorkspaceModal } from '@/components/CreateWorkspaceModal';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusChart } from '@/components/dashboard/StatusChart';
import { PriorityChart } from '@/components/dashboard/PriorityChart';
import { AssigneeChart } from '@/components/dashboard/AssigneeChart';
import { ProjectProgress } from '@/components/dashboard/ProjectProgress';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { TaskListModal } from '@/components/dashboard/TaskListModal';
import { RecentlyViewed, getRecentlyViewed } from '@/components/dashboard/RecentlyViewed';
import { DashboardWidgetWrapper } from '@/components/dashboard/DashboardWidgetWrapper';
import { useDashboardLayout, type WidgetId } from '@/hooks/useDashboardLayout';
import type { DashboardFilter } from '@/api/dashboard';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskListFilter, setTaskListFilter] = useState<DashboardFilter | null>(null);
  const [taskListTitle, setTaskListTitle] = useState('');

  const recentlyViewedItems = getRecentlyViewed();

  const { widgets, editing, setEditing, reorder, toggleVisibility, resetLayout } =
    useDashboardLayout();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const openTaskList = useCallback((filter: DashboardFilter, title: string) => {
    setTaskListFilter(filter);
    setTaskListTitle(title);
  }, []);

  const closeTaskList = useCallback(() => {
    setTaskListFilter(null);
    setTaskListTitle('');
  }, []);

  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();

  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsError,
    error: projectsErr,
    refetch: refetchProjects,
  } = useProjects(activeWorkspaceId || '');

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErr,
    refetch: refetchStats,
  } = useDashboardStats(activeWorkspaceId || '');

  const hasNoWorkspace = !workspacesLoading && (!workspaces || workspaces.length === 0);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorder(oldIndex, newIndex);
      }
    },
    [widgets, reorder],
  );

  if (statsError && projectsError) {
    return (
      <PageError
        message={
          (statsErr as Error)?.message ||
          (projectsErr as Error)?.message ||
          'Failed to load dashboard data'
        }
        onRetry={() => {
          refetchProjects();
          refetchStats();
        }}
      />
    );
  }

  /* ---------- Widget render map ---------- */
  const widgetRenderers: Record<WidgetId, () => React.ReactNode> = {
    'stat-cards': () =>
      statsError ? (
        <PageError
          message={(statsErr as Error)?.message || 'Failed to load stats'}
          onRetry={refetchStats}
        />
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            icon={<ListChecks className="h-5 w-5 text-primary-400" />}
            label="Active Tasks"
            value={stats?.summary.active ?? 0}
            color="bg-primary-600/15"
            loading={statsLoading}
            onClick={() => openTaskList('active', 'Active Tasks')}
          />
          <StatCard
            icon={<CheckSquare className="h-5 w-5 text-emerald-400" />}
            label="Completed"
            value={stats?.summary.completed ?? 0}
            color="bg-emerald-500/15"
            loading={statsLoading}
            onClick={() => openTaskList('completed', 'Completed Tasks')}
          />
          <StatCard
            icon={<Activity className="h-5 w-5 text-blue-400" />}
            label="In Progress"
            value={stats?.summary.inProgress ?? 0}
            color="bg-blue-500/15"
            loading={statsLoading}
            onClick={() => openTaskList('in_progress', 'In Progress Tasks')}
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
            label="Overdue"
            value={stats?.summary.overdue ?? 0}
            color="bg-red-500/15"
            loading={statsLoading}
            onClick={() => openTaskList('overdue', 'Overdue Tasks')}
          />
          <StatCard
            icon={<CalendarClock className="h-5 w-5 text-amber-400" />}
            label="Due This Week"
            value={stats?.summary.dueThisWeek ?? 0}
            color="bg-amber-500/15"
            loading={statsLoading}
            onClick={() => openTaskList('due_this_week', 'Due This Week')}
          />
          <StatCard
            icon={<UserX className="h-5 w-5 text-surface-400" />}
            label="Unassigned"
            value={stats?.summary.unassigned ?? 0}
            color="bg-surface-600/30"
            loading={statsLoading}
            onClick={() => openTaskList('unassigned', 'Unassigned Tasks')}
          />
        </div>
      ),

    'recently-viewed': () =>
      recentlyViewedItems.length > 0 ? (
        <RecentlyViewed items={recentlyViewedItems} />
      ) : editing ? (
        <div className="rounded-lg border border-dashed border-surface-600 p-4 text-center text-sm text-surface-500">
          No recently viewed items to display
        </div>
      ) : null,

    'status-chart': () => (
      <StatusChart data={stats?.byStatus ?? []} loading={statsLoading} />
    ),

    'priority-chart': () => (
      <PriorityChart data={stats?.byPriority ?? []} loading={statsLoading} />
    ),

    'assignee-chart': () => (
      <AssigneeChart data={stats?.byAssignee ?? []} loading={statsLoading} />
    ),

    'project-progress': () => (
      <ProjectProgress data={stats?.projectProgress ?? []} loading={statsLoading} />
    ),

    'recent-activity': () => (
      <RecentActivity data={stats?.recentActivity ?? []} loading={statsLoading} />
    ),

    'recent-projects': () => (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-surface-200">Recent Projects</h2>
          <div className="flex items-center gap-3">
            {activeWorkspaceId && (
              <>
                <button
                  onClick={() => setProjectModalOpen(true)}
                  className="flex items-center gap-1 text-xs font-medium text-surface-400 hover:text-surface-200 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
                <Link
                  to={`/workspaces/${activeWorkspaceId}/projects`}
                  className="flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            )}
          </div>
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
        ) : projectsError ? (
          <PageError
            message={(projectsErr as Error)?.message || 'Failed to load projects'}
            onRetry={refetchProjects}
          />
        ) : !projects || projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-10 w-10" />}
            title="No projects yet"
            description={
              hasNoWorkspace
                ? 'Create a workspace first, then add your first project.'
                : 'Create your first project to start tracking work.'
            }
            action={
              hasNoWorkspace
                ? { label: 'Create Workspace', onClick: () => setWorkspaceModalOpen(true) }
                : activeWorkspaceId
                  ? { label: 'New Project', onClick: () => setProjectModalOpen(true) }
                  : undefined
            }
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
    ),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-100">
            Welcome back
            {user?.name || user?.displayName
              ? `, ${(user.name || user.displayName || '').split(' ')[0]}`
              : ''}
          </h1>
          <p className="mt-1 text-sm text-surface-400">
            Here&apos;s an overview of your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <Button
              variant="secondary"
              size="sm"
              onClick={resetLayout}
              className="text-surface-400"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
          <Button
            variant={editing ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            {editing ? (
              <>
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Done</span>
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Edit Dashboard</span>
              </>
            )}
          </Button>
          {!hasNoWorkspace && activeWorkspaceId && (
            <Button variant="secondary" size="sm" onClick={() => setProjectModalOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">Project</span>
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setWorkspaceModalOpen(true)}>
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">New Workspace</span>
            <span className="sm:hidden">Workspace</span>
          </Button>
        </div>
      </div>

      {/* Edit mode banner */}
      {editing && (
        <div className="rounded-lg border border-dashed border-primary-500/30 bg-primary-600/5 px-4 py-2 text-center text-xs text-surface-400">
          Drag widgets to reorder. Toggle visibility with the eye icon. Click{' '}
          <span className="font-medium text-surface-200">Done</span> when finished.
        </div>
      )}

      {/* No workspace CTA */}
      {hasNoWorkspace && (
        <Card className="border-dashed border-primary-600/40 bg-primary-600/5">
          <CardBody>
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600/15">
                <Building2 className="h-6 w-6 text-primary-400" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-surface-100">
                Create your first workspace
              </h3>
              <p className="mb-4 max-w-xs text-xs text-surface-400">
                A workspace is where your team collaborates. Create one to start adding
                projects and tasks.
              </p>
              <Button size="sm" onClick={() => setWorkspaceModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Workspace
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Sortable Widgets */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgets.map((w) => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-6">
            {widgets.map((widget) => (
              <DashboardWidgetWrapper
                key={widget.id}
                id={widget.id}
                label={widget.label}
                visible={widget.visible}
                editing={editing}
                onToggle={() => toggleVisibility(widget.id)}
              >
                {widgetRenderers[widget.id]()}
              </DashboardWidgetWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <CreateWorkspaceModal
        open={workspaceModalOpen}
        onClose={() => setWorkspaceModalOpen(false)}
      />

      {activeWorkspaceId && (
        <CreateProjectModal
          workspaceId={activeWorkspaceId}
          open={projectModalOpen}
          onClose={() => setProjectModalOpen(false)}
        />
      )}

      {activeWorkspaceId && taskListFilter && (
        <TaskListModal
          open={!!taskListFilter}
          onClose={closeTaskList}
          workspaceId={activeWorkspaceId}
          filter={taskListFilter}
          title={taskListTitle}
        />
      )}
    </div>
  );
}
