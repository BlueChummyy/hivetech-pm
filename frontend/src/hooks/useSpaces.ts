import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { spacesApi, type CreateSpaceData, type UpdateSpaceData } from '@/api/spaces';

export function useSpaces(workspaceId: string) {
  return useQuery({
    queryKey: ['spaces', { workspaceId }],
    queryFn: () => spacesApi.list(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useSpace(workspaceId: string, id: string) {
  return useQuery({
    queryKey: ['spaces', workspaceId, id],
    queryFn: () => spacesApi.getById(workspaceId, id),
    enabled: !!workspaceId && !!id,
  });
}

export function useCreateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateSpaceData }) =>
      spacesApi.create(workspaceId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['spaces', { workspaceId: variables.workspaceId }] });
    },
  });
}

export function useUpdateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, id, data }: { workspaceId: string; id: string; data: UpdateSpaceData }) =>
      spacesApi.update(workspaceId, id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['spaces', { workspaceId: variables.workspaceId }] });
    },
  });
}

export function useDeleteSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, id }: { workspaceId: string; id: string }) =>
      spacesApi.remove(workspaceId, id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['spaces', { workspaceId: variables.workspaceId }] });
      qc.invalidateQueries({ queryKey: ['projects', { workspaceId: variables.workspaceId }] });
    },
  });
}
