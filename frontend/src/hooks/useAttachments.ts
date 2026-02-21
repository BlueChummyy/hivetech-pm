import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentsApi } from '@/api/attachments';

export function useAttachments(taskId: string) {
  return useQuery({
    queryKey: ['attachments', { taskId }],
    queryFn: () => attachmentsApi.list(taskId),
    enabled: !!taskId,
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, file }: { taskId: string; file: File }) =>
      attachmentsApi.upload(taskId, file),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['attachments', { taskId: variables.taskId }] });
      qc.invalidateQueries({ queryKey: ['tasks', variables.taskId] });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) =>
      attachmentsApi.remove(taskId, attachmentId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['attachments', { taskId: variables.taskId }] });
      qc.invalidateQueries({ queryKey: ['tasks', variables.taskId] });
    },
  });
}
