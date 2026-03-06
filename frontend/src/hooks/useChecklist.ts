import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistApi } from '@/api/checklist';

export function useChecklist(taskId: string) {
  return useQuery({
    queryKey: ['checklist', { taskId }],
    queryFn: () => checklistApi.list(taskId),
    enabled: !!taskId,
  });
}

export function useCreateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
      checklistApi.create(taskId, title),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['checklist', { taskId: variables.taskId }] });
    },
  });
}

export function useUpdateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      itemId,
      data,
    }: {
      taskId: string;
      itemId: string;
      data: { title?: string; isChecked?: boolean };
    }) => checklistApi.update(taskId, itemId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['checklist', { taskId: variables.taskId }] });
    },
  });
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, itemId }: { taskId: string; itemId: string }) =>
      checklistApi.remove(taskId, itemId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['checklist', { taskId: variables.taskId }] });
    },
  });
}

export function useReorderChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      items,
    }: {
      taskId: string;
      items: { id: string; position: number }[];
    }) => checklistApi.reorder(taskId, items),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['checklist', { taskId: variables.taskId }] });
    },
  });
}
