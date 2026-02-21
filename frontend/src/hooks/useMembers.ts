import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ['members', projectId],
    queryFn: () => projectsApi.listMembers(projectId),
    enabled: !!projectId,
  });
}
