import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labelsApi, type CreateLabelData, type UpdateLabelData } from '@/api/labels';

export function useLabels(projectId: string) {
  return useQuery({
    queryKey: ['labels', { projectId }],
    queryFn: () => labelsApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateLabelData }) =>
      labelsApi.create(projectId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['labels', { projectId: variables.projectId }] });
    },
  });
}

export function useUpdateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      labelId,
      data,
    }: {
      projectId: string;
      labelId: string;
      data: UpdateLabelData;
    }) => labelsApi.update(projectId, labelId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['labels', { projectId: variables.projectId }] });
    },
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, labelId }: { projectId: string; labelId: string }) =>
      labelsApi.remove(projectId, labelId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['labels', { projectId: variables.projectId }] });
    },
  });
}

export function useAttachLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      labelsApi.attach(taskId, labelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDetachLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      labelsApi.detach(taskId, labelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
