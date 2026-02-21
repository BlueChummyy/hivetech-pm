import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi, type CreateCommentData, type UpdateCommentData } from '@/api/comments';

export function useComments(taskId: string) {
  return useQuery({
    queryKey: ['comments', { taskId }],
    queryFn: () => commentsApi.list(taskId),
    enabled: !!taskId,
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: CreateCommentData }) =>
      commentsApi.create(taskId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['comments', { taskId: variables.taskId }] });
    },
  });
}

export function useUpdateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      commentId,
      data,
    }: {
      taskId: string;
      commentId: string;
      data: UpdateCommentData;
    }) => commentsApi.update(taskId, commentId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['comments', { taskId: variables.taskId }] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, commentId }: { taskId: string; commentId: string }) =>
      commentsApi.remove(taskId, commentId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['comments', { taskId: variables.taskId }] });
    },
  });
}
