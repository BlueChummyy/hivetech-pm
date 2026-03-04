import { useState, useMemo, useCallback, Fragment } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ListChecks,
  Calendar,
  ChevronRight,
  ChevronDown,
  Flag,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import { TaskTableRow } from './TaskTableRow';
import { useUpdateTaskPosition } from '@/hooks/useTasks';
import { useUIStore } from '@/store/ui.store';
import type { Task, ProjectStatus, Priority } from '@/types/models.types';
import type { GroupByConfig } from './FilterBar';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

type SortField = 'taskNumber' | 'title' | 'status' | 'priority' | 'assignee' | 'startDate' | 'dueDate' | 'position';
type SortDirection = 'asc' | 'desc';

interface TaskTableProps {
  tasks: Task[];
  statuses: ProjectStatus[];
  groupBy?: GroupByConfig;
}

interface TaskGroup {
  key: string;
  label: string;
  color?: string;
  tasks: Task[];
}

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};

const PRIORITY_HEX: Record<string, string> = {
  URGENT: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#3B82F6',
  NONE: '#6B7280',
};

const PRIORITY_LABEL: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  NONE: 'None',
};

const MOBILE_PRIORITY_HEX: Record<string, string> = {
  URGENT: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#3B82F6',
  NONE: '#6B7280',
};

const DATE_BUCKET_COLORS: Record<string, string> = {
  Overdue: '#EF4444',
  Today: '#F97316',
  'This Week': '#EAB308',
  'Next Week': '#3B82F6',
  Later: '#6B7280',
  'No Date': '#4B5563',
};

const DATE_BUCKET_ORDER: Record<string, number> = {
  Overdue: 0,
  Today: 1,
  'This Week': 2,
  'Next Week': 3,
  Later: 4,
  'No Date': 5,
};

const MAX_NESTING_DEPTH = 5;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getDateBucket(dateStr: string | null): string {
  if (!dateStr) return 'No Date';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(dateStr);
  const taskDay = new Date(
    taskDate.getFullYear(),
    taskDate.getMonth(),
    taskDate.getDate(),
  );

  if (taskDay < today) return 'Overdue';
  if (taskDay.getTime() === today.getTime()) return 'Today';

  const dayOfWeek = today.getDay(); // 0=Sun
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + daysUntilNextMonday);

  if (taskDay < endOfWeek) return 'This Week';

  const endOfNextWeek = new Date(endOfWeek);
  endOfNextWeek.setDate(endOfWeek.getDate() + 7);
  if (taskDay < endOfNextWeek) return 'Next Week';

  return 'Later';
}

function groupParentTasks(
  parentTasks: Task[],
  groupBy: GroupByConfig,
  statuses: ProjectStatus[],
): TaskGroup[] {
  const map = new Map<string, TaskGroup>();

  for (const task of parentTasks) {
    let key: string;
    let label: string;
    let color: string | undefined;

    switch (groupBy.field) {
      case 'status': {
        const s = statuses.find((st) => st.id === task.statusId);
        key = task.statusId;
        label = s?.name ?? 'Unknown';
        color = s?.color;
        break;
      }
      case 'assignee': {
        key = task.assigneeId ?? '__unassigned__';
        label =
          task.assignee?.name ||
          task.assignee?.displayName ||
          (task.assigneeId ? 'Unknown' : 'Unassigned');
        break;
      }
      case 'priority': {
        key = task.priority;
        label = PRIORITY_LABEL[task.priority] ?? task.priority;
        color = PRIORITY_HEX[task.priority];
        break;
      }
      case 'label': {
        const firstLabel = task.labels?.[0]?.label;
        key = firstLabel?.id ?? '__no_label__';
        label = firstLabel?.name ?? 'No Label';
        color = firstLabel?.color;
        break;
      }
      case 'dueDate': {
        const bucket = getDateBucket(task.dueDate);
        key = bucket;
        label = bucket;
        color = DATE_BUCKET_COLORS[bucket];
        break;
      }
      default:
        key = '__all__';
        label = '';
    }

    if (!map.has(key)) {
      map.set(key, { key, label, color, tasks: [] });
    }
    map.get(key)!.tasks.push(task);
  }

  const result = Array.from(map.values());
  const dir = groupBy.direction === 'asc' ? 1 : -1;

  switch (groupBy.field) {
    case 'status':
      result.sort((a, b) => {
        const sa = statuses.find((s) => s.id === a.key);
        const sb = statuses.find((s) => s.id === b.key);
        return dir * ((sa?.position ?? 0) - (sb?.position ?? 0));
      });
      break;
    case 'priority':
      result.sort(
        (a, b) =>
          dir *
          ((PRIORITY_ORDER[a.key] ?? 4) - (PRIORITY_ORDER[b.key] ?? 4)),
      );
      break;
    case 'assignee':
      result.sort((a, b) => {
        if (a.key === '__unassigned__') return 1;
        if (b.key === '__unassigned__') return -1;
        return dir * a.label.localeCompare(b.label);
      });
      break;
    case 'label':
      result.sort((a, b) => {
        if (a.key === '__no_label__') return 1;
        if (b.key === '__no_label__') return -1;
        return dir * a.label.localeCompare(b.label);
      });
      break;
    case 'dueDate':
      result.sort((a, b) => {
        if (a.key === 'No Date') return 1;
        if (b.key === 'No Date') return -1;
        return (
          dir *
          ((DATE_BUCKET_ORDER[a.key] ?? 5) - (DATE_BUCKET_ORDER[b.key] ?? 5))
        );
      });
      break;
  }

  return result;
}

function buildRenderListForTasks(
  parents: Task[],
  childrenMap: Record<string, Task[]>,
  expandedTasks: Record<string, boolean>,
): { task: Task; depth: number }[] {
  const list: { task: Task; depth: number }[] = [];

  function addTaskAndChildren(task: Task, depth: number) {
    list.push({ task, depth });
    const kids = childrenMap[task.id];
    if (kids && expandedTasks[task.id] && depth < MAX_NESTING_DEPTH) {
      for (const child of kids) {
        addTaskAndChildren(child, depth + 1);
      }
    }
  }

  for (const parent of parents) {
    addTaskAndChildren(parent, 0);
  }

  return list;
}

function calculatePosition(tasks: Task[], overIndex: number): number {
  if (tasks.length === 0) return 1000;
  if (overIndex === 0) return tasks[0].position / 2;
  if (overIndex >= tasks.length) return tasks[tasks.length - 1].position + 1000;
  return (tasks[overIndex - 1].position + tasks[overIndex].position) / 2;
}

/* ------------------------------------------------------------------ */
/*  Mobile card                                                        */
/* ------------------------------------------------------------------ */

function TaskMobileCard({
  task,
  statuses,
}: {
  task: Task;
  statuses: ProjectStatus[];
}) {
  const currentStatus = statuses.find((s) => s.id === task.statusId);
  return (
    <button
      onClick={() => useUIStore.getState().openTaskPanel(task.id)}
      className="w-full text-left rounded-lg border border-white/[0.08] bg-[#1E1E26] p-3 transition-colors hover:bg-[#252530] touch-manipulation"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">
            {task.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">#{task.taskNumber}</p>
        </div>
        {task.assignee && (
          <div
            className="shrink-0"
            title={task.assignee.name || task.assignee.displayName}
          >
            {task.assignee.avatarUrl ? (
              <img
                src={task.assignee.avatarUrl}
                alt=""
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-[10px] font-medium text-white">
                {(
                  task.assignee.name ||
                  task.assignee.displayName ||
                  '?'
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {currentStatus && (
          <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-gray-300">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: currentStatus.color }}
            />
            {currentStatus.name}
          </span>
        )}
        {task.priority !== ('NONE' as Priority) && (
          <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-gray-300">
            <Flag
              className="h-3 w-3"
              style={{ color: MOBILE_PRIORITY_HEX[task.priority] }}
              fill="currentColor"
            />
            {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <Calendar className="h-3 w-3" />
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile group header                                                */
/* ------------------------------------------------------------------ */

function MobileGroupHeader({
  group,
  isCollapsed,
  onToggle,
}: {
  group: TaskGroup;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-lg bg-[#14141A] border border-white/[0.06] px-3 py-2 transition-colors hover:bg-[#1a1a22]"
    >
      {isCollapsed ? (
        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
      ) : (
        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
      )}
      {group.color && (
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: group.color }}
        />
      )}
      <span className="text-sm font-medium text-white">{group.label}</span>
      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-gray-400">
        {group.tasks.length}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Table columns                                                      */
/* ------------------------------------------------------------------ */

const columns: { key: SortField; label: string; sortable: boolean }[] = [
  { key: 'taskNumber', label: 'ID', sortable: true },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'assignee', label: 'Assignee', sortable: true },
  { key: 'startDate', label: 'Start Date', sortable: true },
  { key: 'dueDate', label: 'Due Date', sortable: true },
];

const TOTAL_COLUMNS = columns.length + 2; // +1 for drag handle, +1 for actions

/* ------------------------------------------------------------------ */
/*  TaskTable                                                          */
/* ------------------------------------------------------------------ */

export function TaskTable({ tasks, statuses, groupBy }: TaskTableProps) {
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(
    {},
  );
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const updatePosition = useUpdateTaskPosition();

  const isGrouped =
    !!groupBy && groupBy.enabled && groupBy.field !== 'none';

  const toggleExpand = useCallback((taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  }, []);

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  /* ---- sort ---- */

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks];
    const dir = sortDir === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      switch (sortField) {
        case 'position':
          return dir * (a.position - b.position);
        case 'taskNumber':
          return dir * (a.taskNumber - b.taskNumber);
        case 'title':
          return dir * a.title.localeCompare(b.title);
        case 'status': {
          const sa = statuses.find((s) => s.id === a.statusId);
          const sb = statuses.find((s) => s.id === b.statusId);
          return dir * ((sa?.position ?? 0) - (sb?.position ?? 0));
        }
        case 'priority':
          return (
            dir *
            ((PRIORITY_ORDER[a.priority] ?? 4) -
              (PRIORITY_ORDER[b.priority] ?? 4))
          );
        case 'assignee': {
          const na = a.assignee?.name || a.assignee?.displayName || '';
          const nb = b.assignee?.name || b.assignee?.displayName || '';
          return dir * na.localeCompare(nb);
        }
        case 'startDate': {
          const sa = a.startDate
            ? new Date(a.startDate).getTime()
            : Infinity;
          const sb = b.startDate
            ? new Date(b.startDate).getTime()
            : Infinity;
          return dir * (sa - sb);
        }
        case 'dueDate': {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return dir * (da - db);
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [tasks, sortField, sortDir, statuses]);

  /* ---- hierarchy ---- */

  const childrenMap = useMemo(() => {
    const children: Record<string, Task[]> = {};
    for (const task of sortedTasks) {
      if (task.parentId) {
        if (!children[task.parentId]) children[task.parentId] = [];
        children[task.parentId].push(task);
      }
    }
    return children;
  }, [sortedTasks]);

  const parentTasks = useMemo(
    () => sortedTasks.filter((t) => !t.parentId),
    [sortedTasks],
  );

  /* ---- flat render list (no grouping) ---- */

  const renderList = useMemo(
    () =>
      buildRenderListForTasks(parentTasks, childrenMap, expandedTasks),
    [parentTasks, childrenMap, expandedTasks],
  );

  /* ---- grouped render data ---- */

  const taskGroups = useMemo(() => {
    if (!isGrouped || !groupBy) return null;
    return groupParentTasks(parentTasks, groupBy, statuses);
  }, [isGrouped, parentTasks, groupBy, statuses]);

  /* ---- drag & drop ---- */

  const isDragEnabled = sortField === 'position' && !isGrouped;

  const allTaskIds = useMemo(() => {
    if (taskGroups) {
      const ids: string[] = [];
      for (const g of taskGroups) {
        if (collapsedGroups[g.key]) continue;
        const items = buildRenderListForTasks(
          g.tasks,
          childrenMap,
          expandedTasks,
        );
        for (const item of items) ids.push(item.task.id);
      }
      return ids;
    }
    return renderList.map((item) => item.task.id);
  }, [taskGroups, collapsedGroups, childrenMap, expandedTasks, renderList]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = sortedTasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [sortedTasks],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over || active.id === over.id) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const task = sortedTasks.find((t) => t.id === activeId);
      if (!task) return;

      const withoutActive = sortedTasks.filter((t) => t.id !== activeId);
      const overIndex = withoutActive.findIndex((t) => t.id === overId);
      const position = calculatePosition(
        withoutActive,
        overIndex === -1 ? withoutActive.length : overIndex,
      );

      updatePosition.mutate({
        id: activeId,
        data: { statusId: task.statusId, position },
      });
    },
    [sortedTasks, updatePosition],
  );

  /* ---- empty state ---- */

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-xl bg-white/[0.04] p-4">
          <ListChecks className="h-10 w-10 text-gray-500" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-white">No tasks found</h3>
        <p className="mt-1 text-sm text-gray-400">
          Create a task or adjust your filters.
        </p>
      </div>
    );
  }

  /* ---- render helper for a group's tasks (desktop) ---- */

  function renderGroupRows(groupTasks: Task[]) {
    const items = buildRenderListForTasks(
      groupTasks,
      childrenMap,
      expandedTasks,
    );
    return items.map(({ task, depth }) => {
      const kids = childrenMap[task.id];
      const hasChildren = !!(kids && kids.length > 0);
      return (
        <TaskTableRow
          key={task.id}
          task={task}
          statuses={statuses}
          dragEnabled={isDragEnabled && depth === 0}
          depth={depth}
          hasChildren={hasChildren}
          isExpanded={!!expandedTasks[task.id]}
          onToggleExpand={() => toggleExpand(task.id)}
          subtaskCount={hasChildren ? kids!.length : undefined}
        />
      );
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* ================================================================ */}
      {/*  Mobile card layout                                               */}
      {/* ================================================================ */}
      <div className="space-y-2 md:hidden">
        {isGrouped && taskGroups ? (
          taskGroups.map((group) => (
            <Fragment key={group.key}>
              <MobileGroupHeader
                group={group}
                isCollapsed={!!collapsedGroups[group.key]}
                onToggle={() => toggleGroupCollapse(group.key)}
              />
              {!collapsedGroups[group.key] && (
                <div className="space-y-2 pl-2">
                  {group.tasks.map((task) => (
                    <TaskMobileCard
                      key={task.id}
                      task={task}
                      statuses={statuses}
                    />
                  ))}
                </div>
              )}
            </Fragment>
          ))
        ) : (
          sortedTasks.map((task) => (
            <TaskMobileCard key={task.id} task={task} statuses={statuses} />
          ))
        )}
      </div>

      {/* ================================================================ */}
      {/*  Desktop table layout                                             */}
      {/* ================================================================ */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-white/[0.08]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#14141A]">
              <th scope="col" className="w-8 px-1 py-2.5" />
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    col.sortable && sortField === col.key
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className={cn(
                    'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500',
                    col.sortable &&
                      'cursor-pointer select-none hover:text-gray-300',
                  )}
                  onClick={
                    col.sortable ? () => handleSort(col.key) : undefined
                  }
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable &&
                      (sortField === col.key ? (
                        sortDir === 'asc' ? (
                          <ArrowUp
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                        ) : (
                          <ArrowDown
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                        )
                      ) : (
                        <ArrowUpDown
                          className="h-3 w-3 opacity-0 group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      ))}
                  </div>
                </th>
              ))}
              <th scope="col" className="w-10 px-2 py-2.5" />
            </tr>
          </thead>

          <tbody>
            <SortableContext
              items={allTaskIds}
              strategy={verticalListSortingStrategy}
            >
              {isGrouped && taskGroups
                ? /* ---- grouped rows ---- */
                  taskGroups.map((group) => (
                    <Fragment key={group.key}>
                      {/* Group header */}
                      <tr
                        onClick={() => toggleGroupCollapse(group.key)}
                        className="cursor-pointer border-b border-white/[0.06] bg-[#14141A] hover:bg-[#1a1a22] transition-colors"
                      >
                        <td colSpan={TOTAL_COLUMNS} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {collapsedGroups[group.key] ? (
                              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                            )}
                            {group.color && (
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: group.color }}
                              />
                            )}
                            <span className="text-sm font-medium text-white">
                              {group.label}
                            </span>
                            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-gray-400">
                              {group.tasks.length}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {/* Group tasks */}
                      {!collapsedGroups[group.key] &&
                        renderGroupRows(group.tasks)}
                    </Fragment>
                  ))
                : /* ---- flat rows (no grouping) ---- */
                  renderList.map(({ task, depth }) => {
                    const kids = childrenMap[task.id];
                    const hasChildren = !!(kids && kids.length > 0);
                    return (
                      <TaskTableRow
                        key={task.id}
                        task={task}
                        statuses={statuses}
                        dragEnabled={isDragEnabled && depth === 0}
                        depth={depth}
                        hasChildren={hasChildren}
                        isExpanded={!!expandedTasks[task.id]}
                        onToggleExpand={() => toggleExpand(task.id)}
                        subtaskCount={
                          hasChildren ? kids!.length : undefined
                        }
                      />
                    );
                  })}
            </SortableContext>
          </tbody>
        </table>
      </div>

      <DragOverlay>
        {activeTask ? (
          <table className="w-full">
            <tbody>
              <TaskTableRow
                task={activeTask}
                statuses={statuses}
                dragEnabled={false}
                overlay
              />
            </tbody>
          </table>
        ) : null}
      </DragOverlay>

      {!isDragEnabled && !isGrouped && (
        <p className="mt-2 text-center text-xs text-gray-500 hidden md:block">
          Sort by position to enable drag-and-drop reordering
        </p>
      )}
    </DndContext>
  );
}
