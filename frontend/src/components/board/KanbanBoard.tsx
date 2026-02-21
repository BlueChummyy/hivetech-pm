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
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { useUpdateTaskPosition } from '@/hooks/useTasks';
import type { Task, ProjectStatus } from '@/types/models.types';

interface KanbanBoardProps {
  tasks: Task[];
  statuses: ProjectStatus[];
  projectId: string;
}

function calculateSortOrder(tasks: Task[], overIndex: number): number {
  if (tasks.length === 0) return 1000;
  if (overIndex === 0) return tasks[0].sortOrder / 2;
  if (overIndex >= tasks.length) return tasks[tasks.length - 1].sortOrder + 1000;
  return (tasks[overIndex - 1].sortOrder + tasks[overIndex].sortOrder) / 2;
}

export function KanbanBoard({ tasks, statuses, projectId }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const updatePosition = useUpdateTaskPosition();

  // Keep local tasks in sync when server data changes, but only when not dragging
  useEffect(() => {
    if (!activeTask) {
      setLocalTasks(tasks);
    }
  }, [tasks, activeTask]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    for (const status of statuses) {
      grouped[status.id] = [];
    }
    for (const task of localTasks) {
      if (grouped[task.statusId]) {
        grouped[task.statusId].push(task);
      }
    }
    // Sort each column by sortOrder
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return grouped;
  }, [localTasks, statuses]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const findStatusForTask = useCallback(
    (taskId: string): string | undefined => {
      return localTasks.find((t) => t.id === taskId)?.statusId;
    },
    [localTasks],
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
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      if (activeId === overId) return;

      const activeStatusId = findStatusForTask(activeId);
      // overId could be a task id or a status id (if dropping on an empty column)
      let overStatusId = findStatusForTask(overId);
      if (!overStatusId) {
        // Check if overId is a status/column id
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
    [findStatusForTask, statuses],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const task = localTasks.find((t) => t.id === activeId);
      if (!task) return;

      const statusId = task.statusId;
      const columnTasks = tasksByStatus[statusId] ?? [];
      const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
      const newIndex = columnTasks.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        setLocalTasks((prev) => {
          const other = prev.filter((t) => t.statusId !== statusId);
          return [...other, ...reordered];
        });
      }

      // Calculate the new sort order
      const finalColumnTasks = (tasksByStatus[statusId] ?? []).filter(
        (t) => t.id !== activeId,
      );
      const overIndex =
        overId === statusId
          ? finalColumnTasks.length
          : finalColumnTasks.findIndex((t) => t.id === overId);
      const sortOrder = calculateSortOrder(
        finalColumnTasks,
        overIndex === -1 ? finalColumnTasks.length : overIndex,
      );

      updatePosition.mutate({
        id: activeId,
        data: { statusId, sortOrder },
      });
    },
    [localTasks, tasksByStatus, updatePosition],
  );

  const sortedStatuses = useMemo(
    () => [...statuses].sort((a, b) => a.position - b.position),
    [statuses],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {sortedStatuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            tasks={tasksByStatus[status.id] ?? []}
            projectId={projectId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
