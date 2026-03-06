import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timerApi } from '@/api/timer';

export function useActiveTimer() {
  return useQuery({
    queryKey: ['timer', 'active'],
    queryFn: () => timerApi.getActive(),
    refetchInterval: 30000, // Refresh every 30s to keep in sync
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => timerApi.start(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timer', 'active'] });
    },
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => timerApi.stop(taskId),
    onSuccess: (_data, taskId) => {
      qc.invalidateQueries({ queryKey: ['timer', 'active'] });
      qc.invalidateQueries({ queryKey: ['time-entries', { taskId }] });
      qc.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}
