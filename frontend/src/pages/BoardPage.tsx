import { useParams } from 'react-router-dom';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { useTasks } from '@/hooks/useTasks';
import { useStatuses } from '@/hooks/useStatuses';

function BoardSkeleton() {
  return (
    <div className="flex h-full gap-4 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex w-72 shrink-0 flex-col rounded-lg bg-[#14141A]"
        >
          <div className="flex items-center gap-2 px-3 py-3">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white/[0.08]" />
            <div className="h-4 w-20 animate-pulse rounded bg-white/[0.08]" />
          </div>
          <div className="space-y-2 px-2">
            {Array.from({ length: 3 - i }).map((_, j) => (
              <div
                key={j}
                className="h-24 animate-pulse rounded-lg bg-white/[0.04]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: tasks, isLoading: tasksLoading } = useTasks({
    projectId: projectId ?? '',
  });
  const { data: statuses, isLoading: statusesLoading } = useStatuses(
    projectId ?? '',
  );

  if (tasksLoading || statusesLoading) {
    return <BoardSkeleton />;
  }

  if (!statuses || statuses.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No statuses configured for this project.</p>
          <p className="mt-1 text-sm text-gray-500">
            Go to Settings to add workflow statuses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <KanbanBoard
      tasks={tasks ?? []}
      statuses={statuses}
      projectId={projectId ?? ''}
    />
  );
}
