import { useState, useMemo, useCallback } from 'react';
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
import { ArrowUpDown, ArrowUp, ArrowDown, ListChecks, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import { TaskTableRow } from './TaskTableRow';
import { useUpdateTaskPosition } from '@/hooks/useTasks';
import { useUIStore } from '@/store/ui.store';
import type { Task, ProjectStatus, Priority } from '@/types/models.types';

type SortField = 'taskNumber' | 'title' | 'status' | 'priority' | 'assignee' | 'startDate' | 'dueDate' | 'position';

type SortDirection = 'asc' | 'desc';

interface TaskTableProps {
  tasks: Task[];
  statuses: ProjectStatus[];
}

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};

const MOBILE_PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
  NONE: 'bg-gray-500',
};

function TaskMobileCard({ task, statuses }: { task: Task; statuses: ProjectStatus[] }) {
  const currentStatus = statuses.find((s) => s.id === task.statusId);
  return (
    <button
      onClick={() => useUIStore.getState().openTaskPanel(task.id)}
      className="w-full text-left rounded-lg border border-white/[0.08] bg-[#1E1E26] p-3 transition-colors hover:bg-[#252530] touch-manipulation"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{task.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">#{task.taskNumber}</p>
        </div>
        {task.assignee && (
          <div className="shrink-0" title={task.assignee.name || task.assignee.displayName}>
            {task.assignee.avatarUrl ? (
              <img src={task.assignee.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-[10px] font-medium text-white">
                {(task.assignee.name || task.assignee.displayName || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {currentStatus && (
          <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-gray-300">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: currentStatus.color }} />
            {currentStatus.name}
          </span>
        )}
        {task.priority !== ('NONE' as Priority) && (
          <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-gray-300">
            <span className={cn('h-1.5 w-1.5 rounded-full', MOBILE_PRIORITY_COLORS[task.priority])} />
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

const columns: { key: SortField; label: string; sortable: boolean }[] = [
  { key: 'taskNumber', label: 'ID', sortable: true },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'assignee', label: 'Assignee', sortable: true },
  { key: 'startDate', label: 'Start Date', sortable: true },
  { key: 'dueDate', label: 'Due Date', sortable: true },
];

const MAX_NESTING_DEPTH = 5;

function calculatePosition(tasks: Task[], overIndex: number): number {
  if (tasks.length === 0) return 1000;
  if (overIndex === 0) return tasks[0].position / 2;
  if (overIndex >= tasks.length) return tasks[tasks.length - 1].position + 1000;
  return (tasks[overIndex - 1].position + tasks[overIndex].position) / 2;
}

export function TaskTable({ tasks, statuses }: TaskTableProps) {
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const updatePosition = useUpdateTaskPosition();

  const toggleExpand = useCallback((taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
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
          return dir * ((PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4));
        case 'assignee': {
          const na = a.assignee?.name || a.assignee?.displayName || '';
          const nb = b.assignee?.name || b.assignee?.displayName || '';
          return dir * na.localeCompare(nb);
        }
        case 'startDate': {
          const sa = a.startDate ? new Date(a.startDate).getTime() : Infinity;
          const sb = b.startDate ? new Date(b.startDate).getTime() : Infinity;
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

  const isDragEnabled = sortField === 'position';

  // Build parent/child hierarchy
  const { parentTasks, childrenMap } = useMemo(() => {
    const parents: Task[] = [];
    const children: Record<string, Task[]> = {};

    for (const task of sortedTasks) {
      if (!task.parentId) {
        parents.push(task);
      } else {
        if (!children[task.parentId]) children[task.parentId] = [];
        children[task.parentId].push(task);
      }
    }

    return { parentTasks: parents, childrenMap: children };
  }, [sortedTasks]);

  // Build flat render list respecting expand state (recursive)
  const renderList = useMemo(() => {
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

    for (const parent of parentTasks) {
      addTaskAndChildren(parent, 0);
    }

    return list;
  }, [parentTasks, childrenMap, expandedTasks]);

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

  const taskIds = renderList.map((item) => item.task.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Mobile card layout */}
      <div className="space-y-2 md:hidden">
        {sortedTasks.map((task) => (
          <TaskMobileCard key={task.id} task={task} statuses={statuses} />
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-white/[0.08]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#14141A]">
              {/* Drag handle column header */}
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
                    col.sortable && 'cursor-pointer select-none hover:text-gray-300',
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable &&
                      (sortField === col.key ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100" aria-hidden="true" />
                      ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {renderList.map(({ task, depth }) => {
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

      {!isDragEnabled && (
        <p className="mt-2 text-center text-xs text-gray-500 hidden md:block">
          Sort by position to enable drag-and-drop reordering
        </p>
      )}
    </DndContext>
  );
}
