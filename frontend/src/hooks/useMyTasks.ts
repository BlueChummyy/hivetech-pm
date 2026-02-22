import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/api/tasks';
import { useAuthStore } from '@/store/auth.store';

export function useMyTasks() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['tasks', 'my-tasks'],
    queryFn: () => tasksApi.myTasks(),
    enabled: isAuthenticated,
  });
}
