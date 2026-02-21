import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type CreateStatusData, type UpdateStatusData } from '@/api/projects';

export function useStatuses(projectId: string) {
  return useQuery({
    queryKey: ['statuses', { projectId }],
    queryFn: () => projectsApi.listStatuses(projectId),
    enabled: !!projectId,
  });
}

export function useCreateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateStatusData }) =>
      projectsApi.createStatus(projectId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['statuses', { projectId: variables.projectId }] });
    },
  });
}

export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      statusId,
      data,
    }: {
      projectId: string;
      statusId: string;
      data: UpdateStatusData;
    }) => projectsApi.updateStatus(projectId, statusId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['statuses', { projectId: variables.projectId }] });
    },
  });
}

export function useDeleteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, statusId }: { projectId: string; statusId: string }) =>
      projectsApi.deleteStatus(projectId, statusId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['statuses', { projectId: variables.projectId }] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
