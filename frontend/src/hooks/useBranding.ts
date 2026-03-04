import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { brandingApi, type UpdateBrandingData } from '@/api/branding';

export function useBranding() {
  return useQuery({
    queryKey: ['branding'],
    queryFn: () => brandingApi.get(),
  });
}

export function useUpdateBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBrandingData) => brandingApi.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branding'] });
    },
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => brandingApi.uploadLogo(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branding'] });
    },
  });
}

export function useUploadFavicon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => brandingApi.uploadFavicon(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branding'] });
    },
  });
}
