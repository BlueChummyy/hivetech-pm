import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { projectsApi, type CreateProjectData, type UpdateProjectData } from '@/api/projects';
import { useWorkspaceStore } from '@/store/workspace.store';

export function useProjects(workspaceId: string) {
  return useQuery({
    queryKey: ['projects', { workspaceId }],
    queryFn: async () => {
      try {
        return await projectsApi.list(workspaceId);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 403) {
          // Stale workspace — clear and return empty so UI recovers gracefully
          useWorkspaceStore.getState().clearActiveWorkspace();
          return [];
        }
        throw err;
      }
    },
    enabled: !!workspaceId,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectData) => projectsApi.create(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['projects', { workspaceId: variables.workspaceId }] });
      qc.invalidateQueries({ queryKey: ['spaces', { workspaceId: variables.workspaceId }] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectData }) =>
      projectsApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projects', variables.id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
