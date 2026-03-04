import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { KanbanCard } from './KanbanCard';
import { useProjectPermissions } from '@/hooks/useProjectRole';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import type { Task, ProjectStatus } from '@/types/models.types';

interface KanbanColumnProps {
  status: ProjectStatus;
  tasks: Task[];
  projectId: string;
}

export function KanbanColumn({ status, tasks, projectId }: KanbanColumnProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const permissions = useProjectPermissions(projectId);

  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      role="group"
      aria-label={status.name}
      className={cn(
        'flex h-full w-[85vw] sm:w-72 3xl:w-80 4xl:w-96 shrink-0 flex-col rounded-lg bg-[#14141A] snap-center sm:snap-align-none',
        isOver && 'ring-1 ring-primary-500/40',
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <h3 className="text-sm font-medium text-gray-300">{status.name}</h3>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-gray-400">
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <div ref={setNodeRef} className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>

      {/* Add task */}
      {permissions.canCreateTasks && (
        <div className="px-2 pb-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
          >
            <Plus className="h-4 w-4" />
            Add task
          </button>
        </div>
      )}

      {showCreateModal && (
        <CreateTaskModal
          projectId={projectId}
          statusId={status.id}
          statusName={status.name}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
