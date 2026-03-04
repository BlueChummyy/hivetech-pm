import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeEntriesApi, type CreateTimeEntryData, type UpdateTimeEntryData } from '@/api/time-entries';

export function useTimeEntries(taskId: string) {
  return useQuery({
    queryKey: ['time-entries', { taskId }],
    queryFn: () => timeEntriesApi.list(taskId),
    enabled: !!taskId,
  });
}

export function useCreateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: CreateTimeEntryData }) =>
      timeEntriesApi.create(taskId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['time-entries', { taskId: variables.taskId }] });
      qc.invalidateQueries({ queryKey: ['tasks', variables.taskId] });
    },
  });
}

export function useUpdateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      data,
    }: {
      taskId: string;
      entryId: string;
      data: UpdateTimeEntryData;
    }) => timeEntriesApi.update(entryId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['time-entries', { taskId: variables.taskId }] });
      qc.invalidateQueries({ queryKey: ['tasks', variables.taskId] });
    },
  });
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId }: { taskId: string; entryId: string }) =>
      timeEntriesApi.remove(entryId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['time-entries', { taskId: variables.taskId }] });
      qc.invalidateQueries({ queryKey: ['tasks', variables.taskId] });
    },
  });
}
