import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/api/tasks';

export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: ['dependencies', { taskId }],
    queryFn: () => tasksApi.listDependencies(taskId),
    enabled: !!taskId,
  });
}
