import { get, post, patch, del } from './client';
import type { Task, TaskDependency } from '@/types/models.types';

export interface TaskFilters {
  projectId?: string;
  statusId?: string;
  assigneeId?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTaskData {
  projectId: string;
  statusId: string;
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  parentId?: string;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  statusId?: string;
  priority?: string;
  assigneeId?: string | null;
  assigneeIds?: string[];
  startDate?: string | null;
  dueDate?: string | null;
  position?: number;
}

export interface UpdatePositionData {
  statusId: string;
  position: number;
}

export const tasksApi = {
  myTasks: () =>
    get<Task[]>('/tasks/my-tasks').then((r) => r.data),

  list: async (filters: TaskFilters = {}): Promise<Task[]> => {
    const limit = 100;
    let page = 1;
    let allTasks: Task[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'page' && key !== 'limit') {
          params.append(key, String(value));
        }
      });
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await get<Task[]>(`/tasks?${params.toString()}`);
      const data = res.data;
      allTasks = allTasks.concat(data);

      const meta = (data as any)?._meta?.pagination;
      if (!meta || page >= meta.totalPages) break;
      page++;
    }

    return allTasks;
  },

  getById: (id: string) =>
    get<Task>(`/tasks/${id}`).then((r) => r.data),

  create: (data: CreateTaskData) =>
    post<Task>('/tasks', data).then((r) => r.data),

  update: (id: string, data: UpdateTaskData) =>
    patch<Task>(`/tasks/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    del(`/tasks/${id}`),

  updatePosition: (id: string, data: UpdatePositionData) =>
    patch<Task>(`/tasks/${id}/position`, data).then((r) => r.data),

  moveToProject: (id: string, targetProjectId: string) =>
    post<Task>(`/tasks/${id}/move`, { targetProjectId }).then((r) => r.data),

  // Dependencies
  listDependencies: (id: string) =>
    get<TaskDependency[]>(`/tasks/${id}/dependencies`).then((r) => r.data),

  addDependency: (id: string, data: { dependsOnTaskId: string; type: string }) =>
    post<TaskDependency>(`/tasks/${id}/dependencies`, data).then((r) => r.data),

  removeDependency: (id: string, dependencyId: string) =>
    del(`/tasks/${id}/dependencies/${dependencyId}`),
};
