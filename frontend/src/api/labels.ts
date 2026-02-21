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
    get<Label[]>(`/projects/${projectId}/labels`).then((r) => r.data),

  create: (projectId: string, data: CreateLabelData) =>
    post<Label>(`/projects/${projectId}/labels`, data).then((r) => r.data),

  update: (projectId: string, labelId: string, data: UpdateLabelData) =>
    patch<Label>(`/projects/${projectId}/labels/${labelId}`, data).then((r) => r.data),

  remove: (projectId: string, labelId: string) =>
    del(`/projects/${projectId}/labels/${labelId}`),

  attach: (taskId: string, labelId: string) =>
    post<TaskLabel>(`/tasks/${taskId}/labels`, { labelId }).then((r) => r.data),

  detach: (taskId: string, labelId: string) =>
    del(`/tasks/${taskId}/labels/${labelId}`),
};
