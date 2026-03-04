import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { brandingApi, type UpdateBrandingData } from '@/api/branding';

export function useBranding(workspaceId: string) {
  return useQuery({
    queryKey: ['branding', workspaceId],
    queryFn: () => brandingApi.get(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useUpdateBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: UpdateBrandingData }) =>
      brandingApi.upsert(workspaceId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['branding', variables.workspaceId] });
    },
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, file }: { workspaceId: string; file: File }) =>
      brandingApi.uploadLogo(workspaceId, file),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['branding', variables.workspaceId] });
    },
  });
}

export function useUploadFavicon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, file }: { workspaceId: string; file: File }) =>
      brandingApi.uploadFavicon(workspaceId, file),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['branding', variables.workspaceId] });
    },
  });
}
