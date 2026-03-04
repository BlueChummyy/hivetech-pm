import { get, post, patch, del } from './client';
import type { TaskTemplate } from '@/types/models.types';
import type { Task } from '@/types/models.types';

export interface CreateTemplateData {
  projectId: string;
  name: string;
  description?: string;
  priority?: string;
  subtaskTemplates?: { title: string; priority?: string }[];
}

export interface UpdateTemplateData {
  name?: string;
  description?: string | null;
  priority?: string;
  subtaskTemplates?: { title: string; priority?: string }[];
}

export interface CreateTaskFromTemplateData {
  projectId: string;
  statusId: string;
  title: string;
  description?: string;
}

export const taskTemplatesApi = {
  list: (projectId: string) =>
    get<TaskTemplate[]>(`/task-templates?projectId=${projectId}`).then((r) => r.data),

  getById: (id: string) =>
    get<TaskTemplate>(`/task-templates/${id}`).then((r) => r.data),

  create: (data: CreateTemplateData) =>
    post<TaskTemplate>('/task-templates', data).then((r) => r.data),

  update: (id: string, data: UpdateTemplateData) =>
    patch<TaskTemplate>(`/task-templates/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    del(`/task-templates/${id}`),

  createTaskFromTemplate: (templateId: string, data: CreateTaskFromTemplateData) =>
    post<Task>(`/task-templates/${templateId}/create-task`, data).then((r) => r.data),
};
