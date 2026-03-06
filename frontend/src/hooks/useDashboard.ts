import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard';
import type { DashboardFilter } from '@/api/dashboard';

export function useDashboardStats(workspaceId: string) {
  return useQuery({
    queryKey: ['dashboard', 'stats', workspaceId],
    queryFn: () => dashboardApi.getStats(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 60000, // Refresh every 60 seconds
  });
}

export function useDashboardFilteredTasks(workspaceId: string, filter: DashboardFilter | null) {
  return useQuery({
    queryKey: ['dashboard', 'tasks', workspaceId, filter],
    queryFn: () => dashboardApi.getFilteredTasks(workspaceId, filter!),
    enabled: !!workspaceId && !!filter,
  });
}
