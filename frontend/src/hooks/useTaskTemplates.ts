import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  taskTemplatesApi,
  type CreateTemplateData,
  type UpdateTemplateData,
  type CreateTaskFromTemplateData,
} from '@/api/task-templates';

export function useTaskTemplates(projectId: string) {
  return useQuery({
    queryKey: ['task-templates', projectId],
    queryFn: () => taskTemplatesApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useTaskTemplate(id: string) {
  return useQuery({
    queryKey: ['task-templates', 'detail', id],
    queryFn: () => taskTemplatesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateData) => taskTemplatesApi.create(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['task-templates', variables.projectId] });
    },
  });
}

export function useUpdateTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateData }) =>
      taskTemplatesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-templates'] });
    },
  });
}

export function useDeleteTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskTemplatesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-templates'] });
    },
  });
}

export function useCreateTaskFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: CreateTaskFromTemplateData }) =>
      taskTemplatesApi.createTaskFromTemplate(templateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
