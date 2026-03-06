import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Building2,
  Pencil,
  Check,
  RotateCcw,
  ListChecks,
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckSquare,
  UserX,
  ArrowRight,
  FolderKanban,
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageError } from '@/components/ui/PageError';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useProjects';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useDashboardLayout, type WidgetInstance } from '@/hooks/useDashboardLayout';
import { CreateWorkspaceModal } from '@/components/CreateWorkspaceModal';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { DashboardWidgetWrapper } from '@/components/dashboard/DashboardWidgetWrapper';
import { TaskListModal } from '@/components/dashboard/TaskListModal';
import { RecentlyViewed, getRecentlyViewed } from '@/components/dashboard/RecentlyViewed';
import { WidgetPicker } from '@/components/dashboard/WidgetPicker';
import { DonutChart } from '@/components/charts/DonutChart';
import { HBarChart } from '@/components/charts/HBarChart';
import { VBarChart } from '@/components/charts/VBarChart';
import type { DashboardFilter, DashboardStats } from '@/api/dashboard';

/* ---------- Constants ---------- */

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: '#6b7280',
  ACTIVE: '#3b82f6',
  DONE: '#10b981',
  CANCELLED: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#3b82f6',
  NONE: '#6b7280',
};

const ASSIGNEE_COLORS = [
  '#8b5cf6', '#06b6d4', '#f97316', '#10b981',
  '#ec4899', '#eab308', '#6366f1', '#14b8a6',
];

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  ListChecks,
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckSquare,
  UserX,
};

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary-600/15', text: 'text-primary-400' },
  blue: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  red: { bg: 'bg-red-500/15', text: 'text-red-400' },
  amber: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  surface: { bg: 'bg-surface-600/30', text: 'text-surface-400' },
};

const SUMMARY_KEY_MAP: Record<string, keyof DashboardStats['summary']> = {
  active: 'active',
  in_progress: 'inProgress',
  overdue: 'overdue',
  due_this_week: 'dueThisWeek',
  completed: 'completed',
  unassigned: 'unassigned',
};

/* ---------- Helpers ---------- */

function getChartData(
  dataSource: string | undefined,
  stats: DashboardStats | undefined,
) {
  if (!stats || !dataSource) return [];

  switch (dataSource) {
    case 'byStatus':
      return stats.byStatus.map((s) => ({
        label:
          s.category === 'NOT_STARTED'
            ? 'Not Started'
            : s.category === 'ACTIVE'
              ? 'Active'
              : s.category === 'DONE'
                ? 'Done'
                : 'Cancelled',
        value: s.count,
        color: STATUS_COLORS[s.category] || '#6b7280',
      }));
    case 'byPriority':
      return stats.byPriority.map((p) => ({
        label: p.priority.charAt(0) + p.priority.slice(1).toLowerCase(),
        value: p.count,
        color: PRIORITY_COLORS[p.priority] || '#6b7280',
      }));
    case 'byAssignee':
      return stats.byAssignee.map((a, i) => ({
        label: a.name || 'Unassigned',
        value: a.count,
        color: ASSIGNEE_COLORS[i % ASSIGNEE_COLORS.length],
      }));
    case 'projectProgress':
      return stats.projectProgress.map((p, i) => ({
        label: p.key || p.name,
        value: p.done,
        color: ASSIGNEE_COLORS[i % ASSIGNEE_COLORS.length],
      }));
    default:
      return [];
  }
}

function formatAction(
  action: string,
  entityType: string,
  metadata: Record<string, unknown> | null,
): string {
  const title = (metadata?.title as string) || entityType;
  const verb =
    action === 'created'
      ? 'created'
      : action === 'updated'
        ? 'updated'
        : action === 'deleted'
          ? 'deleted'
          : action;
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

/* ---------- Component ---------- */

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskListFilter, setTaskListFilter] = useState<DashboardFilter | null>(null);
  const [taskListTitle, setTaskListTitle] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const recentlyViewedItems = getRecentlyViewed();

  const {
    widgets,
    editing,
    setEditing,
    reorder,
    toggleVisibility,
    removeWidget,
    addWidget,
    resizeWidget,
    resetLayout,
  } = useDashboardLayout();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const openTaskList = useCallback(
    (filter: DashboardFilter, title: string) => {
      setTaskListFilter(filter);
      setTaskListTitle(title);
    },
    [],
  );

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

      const visibleList = editing ? widgets : widgets.filter((w) => w.visible);
      const oldIndex = visibleList.findIndex((w) => w.id === active.id);
      const newIndex = visibleList.findIndex((w) => w.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Map back to full widgets array indices
        const realOldIndex = widgets.findIndex((w) => w.id === active.id);
        const realNewIndex = widgets.findIndex((w) => w.id === over.id);
        if (realOldIndex !== -1 && realNewIndex !== -1) {
          reorder(realOldIndex, realNewIndex);
        }
      }
    },
    [widgets, editing, reorder],
  );

  const firstName = (user?.name || user?.displayName || '').split(' ')[0];

  /* ---------- Widget Renderer ---------- */

  function renderWidget(widget: WidgetInstance): React.ReactNode {
    const { type, config, colSpan, rowSpan } = widget;

    switch (type) {
      case 'number': {
        const filterKey = config?.filter as DashboardFilter;
        const value = stats?.summary[SUMMARY_KEY_MAP[filterKey]] ?? 0;
        const colors = COLOR_MAP[config?.color || 'primary'];
        const IconComponent = ICON_MAP[config?.icon || 'ListChecks'] || ListChecks;

        if (statsLoading) return <Skeleton className="h-16" />;

        return (
          <button
            onClick={() => {
              if (editing) return;
              openTaskList(filterKey, widget.title);
            }}
            className="flex items-center gap-3 w-full text-left group"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}
            >
              <IconComponent className={`h-5 w-5 ${colors.text}`} />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-surface-100">
                {value}
              </p>
            </div>
          </button>
        );
      }

      case 'donut': {
        const chartData = getChartData(config?.dataSource, stats);
        const total = chartData.reduce((s, d) => s + d.value, 0);
        if (statsLoading) return <Skeleton className="h-40" />;
        const isSmallDonut = colSpan <= 1 && rowSpan <= 1;
        const donutSize = isSmallDonut ? 70 : Math.min(130 + (rowSpan - 2) * 40 + (colSpan - 2) * 20, 240);
        return (
          <div className="flex items-center justify-center h-full">
            <DonutChart
              data={chartData}
              size={donutSize}
              thickness={Math.round(donutSize * 0.17)}
              centerValue={total}
              centerLabel={isSmallDonut ? undefined : 'Total'}
              showLegend={!isSmallDonut}
            />
          </div>
        );
      }

      case 'hbar': {
        const chartData = getChartData(config?.dataSource, stats);
        if (statsLoading) return <Skeleton className="h-32" />;
        const hbarMax = colSpan >= 4 ? 12 : colSpan <= 1 ? 3 : config?.maxItems || 8;
        return (
          <div className="flex items-center justify-center h-full">
            <div className="w-full">
              <HBarChart data={chartData} maxItems={hbarMax} />
            </div>
          </div>
        );
      }

      case 'vbar': {
        const chartData = getChartData(config?.dataSource, stats);
        if (statsLoading) return <Skeleton className="h-40" />;
        const vbarHeight = colSpan <= 1 && rowSpan <= 1 ? 60 : 100 + (rowSpan - 1) * 60;
        return (
          <div className="flex items-center justify-center h-full">
            <div className="w-full">
              <VBarChart
                data={chartData}
                height={vbarHeight}
                maxItems={colSpan <= 1 ? 4 : config?.maxItems || 8}
              />
            </div>
          </div>
        );
      }

      case 'progress': {
        const data = stats?.projectProgress ?? [];
        if (statsLoading) {
          return (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <Skeleton className="mb-2 h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          );
        }
        if (data.length === 0) {
          return <p className="text-sm text-surface-500">No projects with tasks</p>;
        }
        return (
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
        );
      }

      case 'activity': {
        const activityData = stats?.recentActivity ?? [];
        if (statsLoading) {
          return (
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
          );
        }
        if (activityData.length === 0) {
          return <p className="text-sm text-surface-500">No recent activity</p>;
        }
        return (
          <div className="space-y-3">
            {activityData.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <Avatar
                  src={item.user.avatarUrl}
                  name={item.user.name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-surface-300">
                    <span className="font-medium text-surface-200">
                      {item.user.name}
                    </span>{' '}
                    {formatAction(item.action, item.entityType, item.metadata)}
                  </p>
                  <p className="text-xs text-surface-500">
                    {formatTimeAgo(item.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );
      }

      case 'recently-viewed':
        return recentlyViewedItems.length > 0 ? (
          <RecentlyViewed items={recentlyViewedItems} />
        ) : (
          <p className="text-sm text-surface-500 text-center py-4">
            No recent items
          </p>
        );

      case 'projects':
        return renderProjectsWidget();

      default:
        return null;
    }
  }

  /* ---------- Projects widget (inline) ---------- */

  function renderProjectsWidget(): React.ReactNode {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeWorkspaceId && (
              <>
                <button
                  onClick={() => {
                    if (editing) return;
                    setProjectModalOpen(true);
                  }}
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
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-surface-700/40 bg-surface-700/20 p-3"
              >
                <Skeleton className="mb-2 h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </div>
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
                ? {
                    label: 'Create Workspace',
                    onClick: () => setWorkspaceModalOpen(true),
                  }
                : activeWorkspaceId
                  ? {
                      label: 'New Project',
                      onClick: () => setProjectModalOpen(true),
                    }
                  : undefined
            }
          />
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {projects.slice(0, 6).map((project) => (
              <Link key={project.id} to={`/projects/${project.id}/board`}>
                <div className="rounded-lg border border-surface-700/40 bg-surface-700/20 p-3 transition-colors hover:border-surface-600 hover:bg-surface-700/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600/15 text-xs font-bold text-primary-400">
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---------- Error boundary ---------- */

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

  /* ---------- Render ---------- */

  const displayWidgets = editing ? widgets : widgets.filter((w) => w.visible);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-100">
            Welcome back{firstName ? `, ${firstName}` : ''}
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
          {editing && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Widget</span>
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setProjectModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">Project</span>
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setWorkspaceModalOpen(true)}
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">New Workspace</span>
            <span className="sm:hidden">Workspace</span>
          </Button>
        </div>
      </div>

      {/* Edit mode banner */}
      {editing && (
        <div className="rounded-lg border border-dashed border-primary-500/30 bg-primary-600/5 px-4 py-2 text-center text-xs text-surface-400">
          Drag to reorder, hide or remove widgets, add new ones. Click{' '}
          <span className="font-medium text-surface-200">Done</span> when
          finished.
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
                A workspace is where your team collaborates. Create one to start
                adding projects and tasks.
              </p>
              <Button size="sm" onClick={() => setWorkspaceModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Workspace
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Widget Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={displayWidgets.map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
            style={{ gridAutoRows: 'minmax(80px, auto)' }}
          >
            {displayWidgets.map((widget) => (
              <DashboardWidgetWrapper
                key={widget.id}
                id={widget.id}
                widgetType={widget.type}
                colSpan={widget.colSpan}
                rowSpan={widget.rowSpan}
                title={widget.title}
                editing={editing}
                visible={widget.visible}
                onToggle={() => toggleVisibility(widget.id)}
                onRemove={() => removeWidget(widget.id)}
                onResize={(cols, rows) => resizeWidget(widget.id, cols, rows)}
              >
                {renderWidget(widget)}
              </DashboardWidgetWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Modals */}
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

      <WidgetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={(widget) => {
          addWidget(widget);
          setPickerOpen(false);
        }}
        existingIds={widgets.map((w) => w.id)}
      />
    </div>
  );
}
