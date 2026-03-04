import { useQuery } from '@tanstack/react-query';
import { activityApi } from '@/api/activity';

export function useTaskActivity(taskId: string) {
  return useQuery({
    queryKey: ['activity', { taskId }],
    queryFn: () => activityApi.listByTask(taskId),
    enabled: !!taskId,
  });
}
