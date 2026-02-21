import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useProject } from '@/hooks/useProjects';
import { GanttChart } from '@/components/gantt/GanttChart';

export function GanttPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId || '');
  const { data: tasks, isLoading } = useTasks({ projectId });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">
            {project?.name || 'Project'} - Timeline
          </h1>
          <p className="text-sm text-surface-500">
            Gantt chart view of project tasks
          </p>
        </div>
      </div>

      <GanttChart tasks={tasks || []} isLoading={isLoading} />
    </div>
  );
}
