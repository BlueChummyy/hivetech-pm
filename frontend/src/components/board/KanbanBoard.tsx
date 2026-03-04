import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn, type ColumnConfig } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { useUpdateTaskPosition } from '@/hooks/useTasks';
import { useSelectionStore } from '@/store/selection.store';
import type { Task, ProjectStatus } from '@/types/models.types';
import type { GroupByConfig } from '@/components/list/FilterBar';

interface KanbanBoardProps {
  tasks: Task[];
  statuses: ProjectStatus[];
  projectId: string;
  groupBy?: GroupByConfig;
}

function calculatePosition(tasks: Task[], overIndex: number): number {
  if (tasks.length === 0) return 1000;
  if (overIndex === 0) return tasks[0].position / 2;
  if (overIndex >= tasks.length) return tasks[tasks.length - 1].position + 1000;
  return (tasks[overIndex - 1].position + tasks[overIndex].position) / 2;
}

const PRIORITY_ORDER = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'] as const;
const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#3B82F6',
  NONE: '#6B7280',
};

function getAssigneeColumns(tasks: Task[]): ColumnConfig[] {
  const seen = new Map<string, { name: string; color: string; avatarUrl: string | null }>();
  for (const task of tasks) {
    if (task.assignees && task.assignees.length > 0) {
      for (const a of task.assignees) {
        if (a.userId && !seen.has(a.userId)) {
          seen.set(a.userId, {
            name: a.user?.name || a.user?.displayName || 'Unknown',
            color: '#' + a.userId.slice(0, 6).replace(/[^0-9a-f]/gi, 'a'),
            avatarUrl: a.user?.avatarUrl || null,
          });
        }
      }
    } else if (task.assignee && task.assigneeId) {
      if (!seen.has(task.assigneeId)) {
        seen.set(task.assigneeId, {
          name: task.assignee.name || task.assignee.displayName || 'Unknown',
          color: '#' + task.assigneeId.slice(0, 6).replace(/[^0-9a-f]/gi, 'a'),
          avatarUrl: task.assignee.avatarUrl || null,
        });
      }
    }
  }
  const columns: ColumnConfig[] = Array.from(seen.entries())
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([id, { name, color, avatarUrl }]) => ({ id, name, color, avatarUrl }));
  // Always add Unassigned column
  columns.push({ id: '__unassigned__', name: 'Unassigned', color: '#6B7280', avatarUrl: null });
  return columns;
}

function getPriorityColumns(): ColumnConfig[] {
  return PRIORITY_ORDER.map((p) => ({
    id: p,
    name: p === 'NONE' ? 'No Priority' : p.charAt(0) + p.slice(1).toLowerCase(),
    color: PRIORITY_COLORS[p],
  }));
}

function getDueDateColumns(): ColumnConfig[] {
  return [
    { id: '__overdue__', name: 'Overdue', color: '#EF4444' },
    { id: '__today__', name: 'Today', color: '#F97316' },
    { id: '__this_week__', name: 'This Week', color: '#EAB308' },
    { id: '__later__', name: 'Later', color: '#3B82F6' },
    { id: '__no_date__', name: 'No Date', color: '#6B7280' },
  ];
}

function getDueDateGroup(dueDate: string | null): string {
  if (!dueDate) return '__no_date__';
  const now = new Date();
  const due = new Date(dueDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (dueDay < today) return '__overdue__';
  if (dueDay.getTime() === today.getTime()) return '__today__';

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  if (dueDay <= endOfWeek) return '__this_week__';

  return '__later__';
}

function getTaskColumnId(task: Task, groupField: string): string {
  switch (groupField) {
    case 'assignee': {
      if (task.assignees && task.assignees.length > 0) {
        return task.assignees[0].userId;
      }
      if (task.assigneeId) return task.assigneeId;
      return '__unassigned__';
    }
    case 'priority':
      return task.priority || 'NONE';
    case 'dueDate':
      return getDueDateGroup(task.dueDate);
    default:
      return task.statusId;
  }
}

export function KanbanBoard({ tasks, statuses, projectId, groupBy }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const updatePosition = useUpdateTaskPosition();
  const selectionMode = useSelectionStore((s) => s.selectionMode);

  const isStatusGrouping = !groupBy || !groupBy.enabled || groupBy.field === 'status' || groupBy.field === 'none';

  // Keep local tasks in sync when server data changes, but only when not dragging
  useEffect(() => {
    if (!activeTask) {
      setLocalTasks(tasks);
    }
  }, [tasks, activeTask]);

  // Build columns based on groupBy
  const columns: ColumnConfig[] = useMemo(() => {
    if (isStatusGrouping) {
      return [...statuses]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ id: s.id, name: s.name, color: s.color }));
    }
    switch (groupBy!.field) {
      case 'assignee':
        return getAssigneeColumns(tasks);
      case 'priority':
        return getPriorityColumns();
      case 'dueDate':
        return getDueDateColumns();
      default:
        return [...statuses]
          .sort((a, b) => a.position - b.position)
          .map((s) => ({ id: s.id, name: s.name, color: s.color }));
    }
  }, [isStatusGrouping, groupBy, tasks, statuses]);

  // Map status id to status object for "Add task" in status mode
  const statusById = useMemo(() => {
    const map: Record<string, (typeof statuses)[0]> = {};
    for (const s of statuses) map[s.id] = s;
    return map;
  }, [statuses]);

  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    for (const col of columns) {
      grouped[col.id] = [];
    }
    const groupField = isStatusGrouping ? 'status' : groupBy!.field;
    for (const task of localTasks) {
      const colId = getTaskColumnId(task, groupField);
      if (grouped[colId]) {
        grouped[colId].push(task);
      } else if (groupField === 'assignee') {
        // Task with an assignee not in the columns list (shouldn't happen but be safe)
        if (grouped['__unassigned__']) {
          grouped['__unassigned__'].push(task);
        }
      }
    }
    // Sort each column by position
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [localTasks, columns, isStatusGrouping, groupBy]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = localTasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [localTasks],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      // Only allow cross-column drag for status grouping
      if (!isStatusGrouping) return;

      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      if (activeId === overId) return;

      const activeStatusId = localTasks.find((t) => t.id === activeId)?.statusId;
      let overStatusId = localTasks.find((t) => t.id === overId)?.statusId;
      if (!overStatusId) {
        const isColumn = statuses.some((s) => s.id === overId);
        if (isColumn) overStatusId = overId;
      }

      if (!activeStatusId || !overStatusId) return;

      if (activeStatusId !== overStatusId) {
        setLocalTasks((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, statusId: overStatusId } : t,
          ),
        );
      }
    },
    [isStatusGrouping, localTasks, statuses],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;
      // Only handle position updates for status grouping
      if (!isStatusGrouping) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const task = localTasks.find((t) => t.id === activeId);
      if (!task) return;

      const statusId = task.statusId;

      const currentColumnTasks = localTasks
        .filter((t) => t.statusId === statusId)
        .sort((a, b) => a.position - b.position);

      const oldIndex = currentColumnTasks.findIndex((t) => t.id === activeId);
      const newIndex = currentColumnTasks.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(currentColumnTasks, oldIndex, newIndex);
        setLocalTasks((prev) => {
          const other = prev.filter((t) => t.statusId !== statusId);
          return [...other, ...reordered];
        });
      }

      const finalColumnTasks = currentColumnTasks.filter(
        (t) => t.id !== activeId,
      );
      const overIndex =
        overId === statusId
          ? finalColumnTasks.length
          : finalColumnTasks.findIndex((t) => t.id === overId);
      const position = calculatePosition(
        finalColumnTasks,
        overIndex === -1 ? finalColumnTasks.length : overIndex,
      );

      updatePosition.mutate({
        id: activeId,
        data: { statusId, position },
      });
    },
    [localTasks, updatePosition, isStatusGrouping],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div aria-label="Kanban board" className="flex h-full gap-3 sm:gap-4 overflow-x-auto p-2 sm:p-4 snap-x snap-mandatory sm:snap-none">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasksByColumn[col.id] ?? []}
            projectId={projectId}
            status={isStatusGrouping ? statusById[col.id] : undefined}
            selectionMode={selectionMode}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
