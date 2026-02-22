import { get, post, patch, del } from './client';
import type { Label, TaskLabel } from '@/types/models.types';

export interface CreateLabelData {
  name: string;
  color: string;
}

export interface UpdateLabelData {
  name?: string;
  color?: string;
}

export const labelsApi = {
  list: (projectId: string) =>
    get<Label[]>('/labels', { params: { projectId } }).then((r) => r.data),

  create: (projectId: string, data: CreateLabelData) =>
    post<Label>('/labels', { ...data, projectId }).then((r) => r.data),

  update: (_projectId: string, labelId: string, data: UpdateLabelData) =>
    patch<Label>(`/labels/${labelId}`, data).then((r) => r.data),

  remove: (_projectId: string, labelId: string) =>
    del(`/labels/${labelId}`),

  attach: (taskId: string, labelId: string) =>
    post<TaskLabel>(`/labels/${labelId}/tasks/${taskId}`).then((r) => r.data),

  detach: (taskId: string, labelId: string) =>
    del(`/labels/${labelId}/tasks/${taskId}`),
};
